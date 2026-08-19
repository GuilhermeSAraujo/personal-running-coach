# What happens when the user syncs activities

This describes the two-phase Strava sync flow: import activities, optionally match them to the open `SessionPlan`, then regenerate coaching when appropriate.

Primary code:

- Phase 1: [`src/services/strava/syncActivities.ts`](../src/services/strava/syncActivities.ts) via `POST /api/activities/sync`
- Phase 2: [`src/services/matching/confirmMatches.ts`](../src/services/matching/confirmMatches.ts) via `POST /api/session-plans/confirm-matches`
- Regen retry: `POST /api/session-plans/regenerate`
- Undo last activity: `DELETE /api/activities/last`

---

## Quick answer: what documents are updated?

| Step | `Activity` | Open `SessionPlan` | New docs |
| --- | --- | --- | --- |
| Phase 1 sync (import) | **Upserted** from Strava | **Read only** (for suggestions) | None in the match path |
| Phase 1 sync (first sync / no open plan) | **Upserted** | Untouched | May create `AthleteSnapshot` + new `SessionPlan` |
| Confirm matches (≥1 linked session) | **Unchanged** | **Updated** (sessions linked, plan `superseded`) | New `AthleteSnapshot` + new open `SessionPlan` |
| Confirm with 0 matches (all “Not in plan”) | **Unchanged** (already saved in phase 1) | **Superseded** (no session links) | New `AthleteSnapshot` + new open `SessionPlan` |
| Skip matching | **Unchanged** (already saved in phase 1) | **Unchanged** | None |
| Retry generate plan | Unchanged | Unchanged | New `AthleteSnapshot` + new open `SessionPlan` |

Matching stores the link on the **plan side** (`sessions[].activityId`). Activity documents do not get a back-reference to the plan.

---

## Phase 1 — Sync (`POST /api/activities/sync`)

### Always

1. Optionally backfill `sufferScore` on existing activities from raw Strava payloads.
2. Refresh the user’s Strava access token if needed.
3. Fetch Strava activities:
   - **First sync** (no local activities yet): full history (paginated).
   - **Later syncs**: only activities after the newest local `startedAt`.
4. Keep run/walk only; **upsert** into `activities` on `{ userId, stravaActivityId }`.
5. Best-effort reverse-geocode of `raw.start_latlng` via Nominatim into `raw.start_neighborhood` (e.g. `"Belvedere"`). Failures are ignored and never fail the import. Existing `raw.start_neighborhood` values are copied onto the new Strava `raw` payload so a re-sync does not wipe them. If more than 10 activities were upserted (typical first full-history sync), Nominatim is skipped in-request; backfill those with `npm run backfill:start-neighborhood`.

Activity fields written come from the Strava summary mapper (distance, duration, pace, HR, etc.). This is the only time sync mutates activity documents. A local script can also backfill `raw.start_neighborhood` for existing docs:

```bash
npm run backfill:start-neighborhood
```

That command loads `.env`, finds activities that have `raw.start_latlng` but no `raw.start_neighborhood`, and calls Nominatim with a random 1100–2000 ms delay between requests.

### Then branch

**Match path** — used when all of these are true:

- the user already had activities before this sync
- at least one activity was upserted
- there is a latest open `SessionPlan` with at least one open session

In that case:

- **Do not** create a snapshot or a new plan yet
- Score new activities against open planned sessions (heuristic suggestions)
- Return `{ phase: "match", sessionPlanId, activities, sessions, suggestions }`
- The open plan document is **not written**

**Done path** — first sync, no open plan, no new activities, or nothing open to match:

- If upserted > 0, or the user has no `AthleteSnapshot` yet → `generateAthleteSnapshot` (creates snapshot + AI `SessionPlan` with `status: "open"`)
- Return `{ phase: "done", fetched, upserted, skipped }`

---

## Matching UI (client only)

After `phase: "match"`, the sync button shows a panel. The user can:

- accept/edit suggested session assignments, or mark an activity **Not in plan**
- **Confirm** → phase 2 API
- **Skip matching** → close the panel; activities already upserted stay; plan unchanged; no regen

No database writes happen until Confirm (Skip writes nothing).

---

## Phase 2 — Confirm matches (`POST /api/session-plans/confirm-matches`)

### Validation

- Plan must belong to the user and be `open` (missing `status` treated as open)
- No duplicate activities or session orders in the payload
- Activities must exist and belong to the user
- Activities must not already be linked on any plan
- Target sessions must be open and unmatched

### Writes on the existing open plan

For each match with a `sessionOrder`:

- `sessions[i].status` → `"matched"`
- `sessions[i].activityId` → that activity’s `_id`
- `sessions[i].matchedAt` → now

Activities listed as `sessionOrder: null` (“Not in plan”) do not change any session.

On every Confirm (including when every activity is “Not in plan” and `matchedCount` is 0):

- apply any session links from the payload (none when all are “Not in plan”)
- `session_plans.status` → `"superseded"`
- then `generateAthleteSnapshot(userId)` → new `AthleteSnapshot` + new `SessionPlan` (`status: "open"`, sessions default `open`)

Skip matching does not call this API; the open plan is never superseded and no snapshot or new plan is created.

### Activity documents during confirm

**Not updated.** Ownership checks and link uniqueness only. The prescribed ↔ actual relationship lives on `SessionPlan.sessions[].activityId`.

### Regen failure

If matches were saved and the plan was superseded, but snapshot/plan generation fails:

- response includes `matchesSaved: true` and `error: "plan_regen_failed"`
- UI can call `POST /api/session-plans/regenerate`, which loads the latest `superseded` plan (for continuity context) and calls `generateAthleteSnapshot` again

---

## End-to-end pictures

### Incremental sync with matches

```text
User taps Sync
  → upsert Activity docs
  → return suggestions (SessionPlan unread-only)
User confirms matches
  → update SessionPlan sessions + status=superseded
  → create AthleteSnapshot
  → create new SessionPlan (open)
```

### Skip matching

```text
User taps Sync
  → upsert Activity docs
User skips matching
  → SessionPlan unchanged
  → no new snapshot/plan
```

### Confirm with all “Not in plan”

```text
User taps Sync
  → upsert Activity docs
User confirms with no session links
  → SessionPlan status=superseded (no session links)
  → create AthleteSnapshot
  → create new SessionPlan (open)
```

### First sync

```text
User taps Sync
  → upsert Activity docs (full history)
  → create AthleteSnapshot + SessionPlan
  → no matching UI
```

---

## Undo last activity (`DELETE /api/activities/last`)

Home’s Recent activity card can delete the newest activity (`startedAt`) and roll coaching back to the state before that import.

Writes, for the signed-in user:

1. Delete the last `Activity`.
2. Delete every `AthleteSnapshot` and `SessionPlan` with `createdAt >=` that activity’s `createdAt` (confirm regen, later regen retries). Skip matching does not create those docs, so the current snapshot/plan stay.
3. On remaining plans, any session linked to the deleted activity is set back to `status: "open"` with `activityId` / `matchedAt` cleared.
4. Newest remaining `SessionPlan` is set to `status: "open"` (no-op if already open, or if none remain).
5. Delete today’s `DailyCoachMessage` (UTC date). The home coach card then regenerates on the next GET.

The next **Sync** will re-fetch the Strava activity because incremental sync uses `after` the newest remaining `startedAt`.

If one sync upserted several activities, this still deletes **only** the newest by `startedAt`. Post-confirm snapshot/plan still go away if they were created after that activity.

---

## Rolling weekly plan

- Open plans are a rolling 7-day week (UTC), one entry per day including `rest`
- Confirm (including zero matches) supersedes and regenerates with continuity context (completed vs remaining) for the AI
- New plan stores only the upcoming week; rest days are not matchable

---

## Related models (unchanged by this flow)

- `User` — token refresh may update Strava token fields during sync
- `Workout` / `TrainingPlan` — not used by the live matching path
- Old superseded `SessionPlan` documents remain in MongoDB as history with their matched `activityId`s
