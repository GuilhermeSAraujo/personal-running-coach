# Activity athlete feedback

## Problem

After syncing Strava activities, Confirm regenerates the next plan from quantitative metrics only. Athletes cannot say a run felt too easy or too hard, so the coach cannot adapt load to perception.

## Goal

During the match UI, let the athlete optionally attach per-activity effort (`too_easy` / `about_right` / `too_hard`) and free-text notes. Persist that feedback on the Activity and include it in the athlete snapshot so plan regeneration adapts intensity.

## Non-goals

- RPE scale (1–10)
- Overall week note (single box for the whole sync)
- Editing past feedback outside match Confirm
- Changing Skip matching behavior
- New activity-history UI

## Behavior

1. Athlete syncs; match UI appears when applicable (unchanged).
2. Per newly synced activity: session select + optional effort select + optional notes textarea.
3. On **Confirm**:
   - Validate effort enum and notes length (max 500, trimmed).
   - Write `athleteFeedback` on each Activity that has effort and/or notes.
   - Persist session↔activity links, supersede open plan, regenerate snapshot + next plan (existing path).
4. Snapshot `recentActivities` include `athleteFeedback` when set (omit when empty).
5. AI system instruction: when `athleteFeedback` is present, adapt intensity/volume accordingly.
6. **Skip matching**: no feedback written; plan unchanged.
7. Regen retry and later regenerations see stored feedback via the snapshot automatically.
8. Strava re-sync `$set` upserts omit `athleteFeedback`, so existing notes are preserved.

## Data model

On `Activity` (optional):

```ts
athleteFeedback?: {
  effort?: "too_easy" | "about_right" | "too_hard"
  notes?: string  // trimmed, max 500 chars
}
```

Mirrored optionally on snapshot `ISnapshotActivity.athleteFeedback`.

## API

Confirm payload matches may include optional `effort` and `notes`. Invalid values → 400 before any writes. Empty feedback is allowed (Confirm never blocked).

## Success criteria

- Optional effort + notes appear per activity in the match UI.
- Confirm with feedback persists on Activity and influences the regenerated plan via the snapshot.
- Confirm with empty feedback still regenerates as today.
- Skip matching does not write feedback.
- Re-sync of the same Strava activity does not clear `athleteFeedback`.
