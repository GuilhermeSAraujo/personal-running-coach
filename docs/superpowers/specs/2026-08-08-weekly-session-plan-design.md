# Weekly Session Plan — Design

Date: 2026-08-08

## Goal

Replace the fixed “next 3 sessions” AI plan with a **rolling 7-day weekly plan**: exactly one entry per day (run or rest), each with a target date. On plan re-creation after matches, pass completed and remaining sessions to the AI for **soft continuity** so the following days stay coherent with what was already prescribed.

## Problem

Today `generateNextSessions` always asks for exactly three sessions, with no dates. On confirm-matches the open plan is superseded and a brand-new plan is generated from the athlete snapshot alone. Remaining prescribed workouts are discarded, so mid-week regen breaks continuity.

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Window | Rolling 7 days from today: `[today, today+6]` |
| Timezone | UTC calendar dates (same convention as snapshot weekly bucketing) |
| Day coverage | Exactly 7 sessions — one per date in the window |
| Rest | Explicit session type `rest` (not an omitted day) |
| Continuity | Soft: AI gets completed + remaining; should keep remaining mostly intact with light tweaks allowed |
| New plan contents | Upcoming week only; completed sessions are prompt context, not re-stored |
| Session count signal | Non-`rest` count is the “how many trainings”; call it out in `rationale` |
| Schema version bump | Not needed (DB will be wiped; no production users) |
| Same-day match bias | Out of scope for v1 |
| Hard-lock remaining sessions in code | Out of scope (Approach 2 later if AI drifts) |

## Approach

**Approach 1 — Prompt + schema only** (chosen).

Keep the existing lifecycle (match → supersede → snapshot → new plan). Change the AI contract to a dated 7-day week including `rest`, and pass a continuity payload on regen.

Rejected:

- **Approach 2 — Server-side carry of remaining sessions** — stronger continuity but fights soft continuity and adds merge edge cases when the rolling window shifts.
- **Approach 3 — Mutate open plan in place** — natural continuity but larger change to sync/history and plan versioning.

## Behavior & lifecycle

### Planning window

Each generation covers UTC dates `D0 … D6` where `D0` is today’s UTC date.

### Session shape

Every plan has exactly **7** `sessions` entries:

- Unique `scheduledDate` (`YYYY-MM-DD`) covering all seven days
- Unique `order` (1–7) for matching UI
- `type` is a run type or `rest`

Rest sessions:

- `type: "rest"`
- pt-BR `title`, `purpose`, `coachingNotes` (why rest / what to do)
- No distance/pace/HR targets; `segments` must be `[]`
- Never matched to Strava activities

Run sessions keep the existing segment/distance/pace structure.

Sessions are stored sorted by `scheduledDate` ascending, with `order` `1…7` matching that order.

`rationale` explains the week and states how many trainings (non-rest days), e.g. “4 treinos nesta semana”.

### Sync / match / regen (unchanged shape)

1. Sync may return match suggestions against **open non-rest** sessions.
2. Confirm matches marks those sessions `matched`, sets plan `superseded` if ≥1 match.
3. `generateAthleteSnapshot` → `generateNextSessions` creates a new open plan for the next rolling week.
4. If regen fails after matches saved, existing `plan_regen_failed` + `POST /api/session-plans/regenerate` retry remains.

### Continuity on re-creation

Before calling the AI (confirm path and regenerate retry when a prior plan exists), build a continuity payload from the superseded (or latest prior) plan:

```text
window: { startDate, endDate }   // new rolling window
completedSessions: [             // matched run sessions
  { order, title, type, scheduledDate?, purpose, activity summary? }
]
remainingSessions: [             // still-open run + rest
  { order, title, type, scheduledDate?, purpose, segments, coachingNotes }
]
```

Prompt rules:

- Soft-preserve remaining sessions (structure, intent, dates when still inside the new window).
- Allow light tweaks.
- Freely plan days that are gaps relative to remaining continuity.
- Remaining sessions whose date falls outside the new window may be lightly shifted into the window.
- New stored plan contains only the new 7 upcoming days (all `status: "open"`). Completed sessions are not copied onto the new document.

First generate / no prior plan: omit the continuity block; generate from snapshot alone.

## Data model

### `SESSION_TYPES`

Add `"rest"`:

```ts
export const SESSION_TYPES = [
  "easy",
  "tempo",
  "long_run",
  "interval",
  "recovery",
  "rest",
] as const;
```

### `IPlannedSession`

Add required `scheduledDate: string` (`YYYY-MM-DD`).

### `SessionPlan` mongoose validator

Replace “exactly 3 items” with “exactly 7 items”.

No `SESSION_PLAN_SCHEMA_VERSION` bump (fresh DB).

## AI contract

### System instruction changes

- Plan the next **7 calendar days** (UTC), one session per day.
- Include `rest` days explicitly.
- State training count (non-rest) in rationale.
- Soft continuity when a continuity JSON block is provided.
- Natural-language fields remain pt-BR.

### Response schema / validation

- `sessions`: exactly 7 items
- Each requires `scheduledDate`
- Validate:
  - dates are exactly the set `{D0…D6}`
  - unique `order` values `1…7` in chronological date order
  - `rest` sessions have `segments: []` and no distance/pace/HR fields
  - non-`rest` sessions keep existing segment rules (`segments` min length 1)
- Drop the hard-coded “exactly 3” checks in `sessionPlanSchema.ts`, `validateSessionPlan.ts`, and related tests

## Code touchpoints

| Area | Change |
| --- | --- |
| `generateNextSessions` | Weekly prompt; optional continuity input; persist `scheduledDate` |
| `generateAthleteSnapshot` / confirm / regenerate | Load prior plan; pass completed vs remaining into generation |
| `sessionPlanSchema.ts` / `validateSessionPlan.ts` | 7 days, `scheduledDate`, `rest` rules |
| `SessionPlan` model / `shared` types | `rest` type; date field; length 7 |
| Matching (`suggestMatches`, confirm UI) | Only suggest/assign **open non-rest** sessions |
| UI (`NextSessionsPlan`, `SessionPlanDetails`, match dropdown) | Show `scheduledDate`; distinguish rest visually if trivial |
| Summary types | `PlannedSessionSummary.scheduledDate` |
| `docs/activity-sync.md` | Weekly plan + continuity notes |

## Matching details

- Heuristic scoring and confirm payload still use `sessionOrder`.
- Rest sessions are excluded from suggestion candidates and from the match dropdown (or shown disabled / omitted).
- Confirm with zero run matches still does not regenerate (unchanged).

## Errors

- Invalid AI JSON / validation failure: same as today (generation fails; confirm may return `plan_regen_failed` if matches already saved).
- No new user-facing error modes beyond existing regen retry.

## Testing

- Validator: exactly 7 sessions; full date coverage; duplicate dates rejected; `rest` without distance; run types still require sensible structure as today.
- Continuity payload builder: splits matched vs open; excludes matched from “remaining”; includes rest in remaining when open.
- Update existing “exactly 3” tests.

## Out of scope

- Hard-locking remaining sessions in application code
- Athlete local timezone
- Preferring same-calendar-day activity↔session matches
- Explicit “skipped” rest handling beyond existing session statuses
- Migrating old 3-session documents (DB wipe)

## Success criteria

1. New plans always have 7 dated days, mix of run types and `rest`.
2. Rationale (or equivalent) makes training count clear.
3. After matching mid-week, regen receives completed + remaining context and tends to preserve remaining intent.
4. Match UI never assigns Strava activities to rest days.
5. Existing sync → match → confirm → regen control flow still works.
