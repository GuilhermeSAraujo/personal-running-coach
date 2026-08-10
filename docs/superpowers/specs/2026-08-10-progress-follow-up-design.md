# Progress Follow-up — Design

Date: 2026-08-10

## Goal

Give the athlete one mobile-first home surface to see **what they’ve already done** and **what’s still ahead**: this week’s open `SessionPlan` (matched vs open) plus a ~4-week timeline of matched sessions and unplanned Strava runs.

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Primary job | Plan follow-up + recent history (not fitness trends) |
| Route | Primary surface is home `/`; `/progress` permanently redirects to `/` |
| History window | Last ~28 days |
| Completed row content | Planned prescription + actual activity, stacked (no hit/miss cue) |
| Unmatched activities | Same timeline as matched, labeled **Unplanned** |
| Approach | Home-hosted UI on live `SessionPlan` + `Activity` stack |
| Layout | Mobile-first single column; planned vs actual never side-by-side columns |
| Skipped sessions | Omit from display in v1 |
| This week vs history | Open-plan sessions appear under This week; if an open session’s date was already matched on a superseded plan, overlay that match as Done in This week and omit it from history |
| Models | No new models; do not wire `Workout` / `TrainingPlan` / `Evaluation` |
| Out of scope | AthleteSnapshot trends, hit/miss scoring, match editing, automated tests |

## Page structure (home, signed-in)

1. **This week** — open `SessionPlan` in schedule order: matched (planned + actual), open (prescription), rest as Rest. Link to `/session-plans/[id]`.
2. **Recent history (~4 weeks)** — newest-first timeline: matched sessions from superseded plans in the window + unplanned activities interleaved by date. Matched dates already shown under This week (including overlay from prior plans) are omitted here.
3. Empty states nudge sync / plan generation when needed.
4. Activity highlights remain below progress when available.

## Data assembly

`getProgressFollowUp(userId)`:

1. Load open `SessionPlan`; attach Activity summaries for matched sessions (`distanceKm`, `durationSeconds`, `paceSecondsPerKm`, `startedAt`). Orphan `activityId` → planned only + `activityUnavailable`. If an open session’s `scheduledDate` was already matched on a scanned superseded plan, overlay that match as Done in This week.
2. Load activities with `startedAt` in the last 28 days.
3. Scan recent plans (open + superseded); emit matched sessions in the window for history, excluding the open plan’s sessions and any `scheduledDate` already shown as matched under This week.
4. Emit unplanned activities whose `_id` is not referenced by any matched session in the scanned plans.
5. Sort history newest-first.
6. Extend `PlannedSessionSummary` with `status`, `activityId`, `matchedAt` for reuse elsewhere; progress uses its own DTOs with joined activity facts.

## UI

- Shared row component: header (date · title · type) + status cue (Done / Unplanned / Rest) + stacked Planned / Actual blocks.
- Reuse home Chakra patterns (`Container maxW="md"`, muted secondary text). No card chrome.
- Auth: unauthenticated users see the home sign-in gate (no progress). `/progress` redirects to `/`.

## Explicit non-goals (v1)

Trends/charts from AthleteSnapshot, hit/miss distance cues, `skipped` UI, expanding rows into a second detail page.
