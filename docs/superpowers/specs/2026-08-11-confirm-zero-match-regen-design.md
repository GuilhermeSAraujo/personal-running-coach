# Confirm with zero matches regenerates plan

## Problem

After syncing Strava activities, the match UI lets the athlete link runs to planned sessions. Confirming with every activity as “Not in plan” (`matchedCount === 0`) currently saves nothing meaningful and **does not** regenerate the athlete snapshot or next session plan.

That breaks the common case of running on a rest day (or otherwise off-plan): the new activity is stored, but the open week is left unchanged instead of being readapted.

## Goal

On **Confirm**, always supersede the current open plan and regenerate the athlete snapshot + next plan — including when no activity is linked to a session. **Skip matching** remains an escape hatch that leaves the plan unchanged.

## Non-goals

- Changing sync match-phase gating in `syncActivities.ts`
- Changing Skip matching behavior
- Changing the regenerate retry endpoint beyond existing use
- Automated tests for this change

## Behavior

1. Athlete syncs; match UI appears when applicable (unchanged).
2. Athlete hits **Confirm** (any mix of linked sessions and “Not in plan”, including all “Not in plan”).
3. Persist any session↔activity links (unchanged validation rules).
4. Always set the confirmed open plan to `superseded` (remove the `matchedCount >= 1` gate).
5. Always call `generateAthleteSnapshot` with `priorPlan` built from that plan’s sessions (continuity for remaining / completed work).
6. Success requires a newer `open` plan created after the superseded one (same check as today).
7. **Skip matching**: no API call; plan stays open; UI message “Activities saved. Plan unchanged.”

Unmatched activities still influence the new plan because the snapshot is built from all stored activities.

## Implementation

### `confirmMatches` (`src/services/matching/confirmMatches.ts`)

- After the match loop and `plan.save()`:
  - Always `plan.status = "superseded"` before save (or equivalent: supersede whenever Confirm succeeds, not only when `matchedCount >= 1`).
  - Remove the early return `{ ok: true, matchedCount: 0, regenerated: false }`.
  - Always run the existing regenerate path (`generateAthleteSnapshot` + newer-open-plan check).
- Return shape stays the same: `ok` / `regenerated: true` on success; `plan_regen_failed` with `matchesSaved: true` (and `matchedCount`) on regen failure.

### `SyncActivitiesButton` (`src/components/SyncActivitiesButton.tsx`)

- Remove the post-Confirm branch that shows “Activities saved. Plan unchanged.” when `matchedCount === 0`.
- Keep Skip messaging and Retry generate plan for `plan_regen_failed` as today.

### Out of scope files

- `src/services/strava/syncActivities.ts` — no behavior change
- `/api/session-plans/regenerate` — unchanged; still used for retry after failed regen

## Error handling

Same as matched Confirm today:

- Matches (if any) are saved and the plan is superseded before regen.
- If snapshot/plan generation fails, return `plan_regen_failed` with `matchesSaved: true`.
- UI offers “Retry generate plan,” which uses the existing regenerate route (prior plan from latest superseded).

## Success criteria

- Confirm with all activities “Not in plan” supersedes the open plan and produces a new open plan informed by the new activities and prior-plan continuity.
- Confirm with some/all matches still regenerates as today.
- Skip matching does not supersede or regenerate.
