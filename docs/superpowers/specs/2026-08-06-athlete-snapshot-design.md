# Athlete Snapshot — Design

Date: 2026-08-06

## Goal

Produce a compact, deterministic, immutable summary of an athlete's training state that can be handed to an LLM as the sole input for evaluation and training-plan generation, without the model ever seeing raw Strava records.

A new `AthleteSnapshot` document is written on every sync that brings in new activities, giving both a current context object and, for free, a historical progression timeline.

## Problem

`docs/ai-running-coach-data-model.md` §13–14 establishes the rule: the AI interprets, the backend calculates. Today nothing calculates. `src/services/activities/highlights.ts` computes three single-activity highlights; there is no weekly aggregation, no trend detection, and no context builder.

Feeding raw activities to a model is both expensive and unreliable — it would have to derive weekly mileage and consistency itself, which §13 explicitly forbids.

## Naming

The collection is `athlete_snapshots`, model `AthleteSnapshot`.

Not `NormalizedActivity`: `Activity` is already the normalized activity (`distanceKm`, `paceSecondsPerKm`, `heartRate`, `elevationGainMeters`). This is one document per athlete per point in time, not one per run.

## Relationship to `Evaluation`

`AthleteSnapshot` is the **objective** half — deterministic, computed, no AI involvement. `Evaluation` remains the **interpretive** half (`analysis`, `recommendations`, `goalAssessment`).

A future evaluation will reference a snapshot rather than recomputing `IAthleteMetrics`. That refactor is out of scope here; `Evaluation` is left untouched.

## Approach

Pure functions over an in-memory array of activities, composed by a thin orchestrator, with one impure wrapper that loads from Mongo and persists.

Rejected alternatives:

- **Mongo aggregation pipeline** — cannot be unit tested without a live database, and the data volume does not justify it.
- **Single monolithic service function** — the weekly bucketing, effort estimation, and trend rules each have distinct edge cases and deserve isolated tests.

This matches the existing repo convention: pure helpers with colocated `*.test.ts` files using `node:assert/strict`, run via `npx tsx` (see `src/services/strava/mapActivity.test.ts`).

## Known data limitation: estimated efforts

Strava returns true `best_efforts` and kilometre splits **only** from the per-activity detail endpoint `GET /activities/{id}`, one call per activity. `src/services/strava/client.ts` calls only the bulk `athlete/activities` list endpoint, which omits both.

Rather than add a per-activity fetch and a slow backfill, efforts are **approximated from whole-activity pace** and typed explicitly as estimates.

Qualification rule: an activity counts as an effort at nominal distance `D` when

```text
D <= distanceKm <= D * 1.15
```

So a 5.70 km run can stand in for a 5K; a 12 km run cannot. Candidates are ranked by `paceSecondsPerKm` (lowest wins).

Every effort carries both the real measurements and the derived nominal time, so the estimation is visible to the consumer rather than being disguised as a real 5K time.

Upgrading to true `best_efforts` later is additive: the shape of `IEstimatedEffort` does not change, only its source and accuracy.

## Data model

**File:** `src/models/AthleteSnapshot.ts`, exported from `src/models/index.ts`.

```ts
export interface IAthleteSnapshot {
  userId: Types.ObjectId;
  schemaVersion: number;
  generatedAt: Date;
  windowStart: Date;   // Monday 00:00 UTC, 12 weeks back (inclusive)
  windowEnd: Date;     // Monday 00:00 UTC of the current week (exclusive)

  profile: {
    ageYears?: number;
    weightKg?: number;
    heightCm?: number;
    firstActivityAt?: Date;
    lifetimeRunCount: number;
  };

  goal?: {
    type: GoalType;
    distanceKm: number;
    targetTimeSeconds: number;
    targetDate: Date;
    weeksUntilTarget: number;
  };

  recentTraining: {
    weeks: IWeeklyTraining[];               // exactly 12 completed weeks, oldest first
    recentActivities: ISnapshotActivity[];  // last 10 runs, newest first
    longestRun?: ISnapshotActivity;         // windowStart..generatedAt
    bestEfforts: IEstimatedEffortSet;       // windowStart..generatedAt
  };

  historicalPerformance: {
    personalBests: IPersonalBestSet;        // lifetime
    longestRun?: ISnapshotActivity;         // lifetime
    lifetimeDistanceKm: number;
    lifetimeRuns: number;
  };

  currentState: ICurrentState;

  createdAt: Date;
}

export interface IWeeklyTraining {
  weekStart: Date;                    // Monday 00:00 UTC
  runs: number;
  distanceKm: number;
  durationSeconds: number;
  longestRunKm: number;
  averagePaceSecondsPerKm?: number;   // distance-weighted
  averageHeartRate?: number;          // duration-weighted, HR runs only
  activitiesWithHeartRate: number;
  elevationGainMeters: number;
  totalSufferScore?: number;
  walkCount: number;
  walkDistanceKm: number;
}

export interface ISnapshotActivity {
  date: Date;
  distanceKm: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
  elevationGainMeters: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  sufferScore?: number;
}

export interface IEstimatedEffort {
  nominalDistanceKm: number;     // 5
  actualDistanceKm: number;      // 5.24
  actualTimeSeconds: number;
  paceSecondsPerKm: number;
  estimatedTimeSeconds: number;  // paceSecondsPerKm * nominalDistanceKm
  date: Date;
  averageHeartRate?: number;
}

export interface IEstimatedEffortSet {
  "1k"?: IEstimatedEffort;
  "3k"?: IEstimatedEffort;
  "5k"?: IEstimatedEffort;
  "10k"?: IEstimatedEffort;
}

export interface IPersonalBestSet extends IEstimatedEffortSet {
  halfMarathon?: IEstimatedEffort;
  marathon?: IEstimatedEffort;
}

export interface ICurrentState {
  weeklyVolumeKm: {
    average12w: number;
    average4w: number;
    currentWeek: number;        // partial in-progress week, not in `weeks`
  };
  frequency: {
    averageRunsPerWeek12w: number;
    averageRunsPerWeek4w: number;
  };
  longRun: {
    currentLongestKm: number;   // longest run in the 28 days before generatedAt
    averageKm12w: number;       // mean of each week's longestRunKm, active weeks only
  };
  consistency: {
    weeksWithAtLeast3Runs: number;
    totalWeeks: number;
  };
  trends: {
    volume: "increasing" | "stable" | "decreasing";
    pace?: "improving" | "stable" | "declining";
    heartRate?: "improving" | "stable" | "declining";
  };
  heartRateCoverage: number;    // 0..1, runs with HR / total runs, windowStart..generatedAt
}
```

Index: `{ userId: 1, createdAt: -1 }`.

Documents are roughly 5 KB, so retaining every snapshot is cheap.

### Field notes

- **`schemaVersion`** — snapshots are immutable, so as this shape evolves old documents must remain identifiable. Starts at `1`.
- **`goal` is optional** — a sync can in principle run before onboarding completes. Absence must not crash generation.
- **`ageYears`** — computed from `User.profile.birthDate` at generation time and frozen. The user model stores a birth date, not an age.
- **`weeksUntilTarget`** — derived from `goal.targetDate`. More directly useful to a planner than the raw date. May be zero or negative if the race has passed.
- **`firstActivityAt`** — earliest activity of any type in the database. A proxy for running experience; there is no `runningSince` field on `User`.
- **`goal.objective`** (`finish` vs `improve_time`) is deliberately **not** included. Onboarding does not collect it and `src/lib/onboardingDefaults.ts` always fills a `targetTimeSeconds`, so there is nothing to derive it from. Adding it is a separate change to onboarding.
- **`medianPaceSecondsPerKm`** is deliberately **not** included. Alongside a distance-weighted weekly average and ten individually-listed recent activities, it adds a field without adding information.

## Calculation rules

All rules are deterministic. The AI must never be asked to compute these.

### Runs versus walks

Per `docs/ai-running-coach-data-model.md` §17, every running metric — volume, pace, longest run, consistency, frequency, efforts, PBs, trends, HR coverage — counts `type: "run"` only.

Walking appears solely as `walkCount` and `walkDistanceKm` on each week, so the coach can see aerobic load that is not running.

### Week boundaries and the partial current week

Weeks start Monday at 00:00 UTC. `weekStart` is normalised to that instant.

`weeks` holds the **12 completed weeks** immediately before the current one. `windowStart` is `weeks[0].weekStart`; `windowEnd` is the Monday of the week containing `generatedAt`, exclusive.

The in-progress week is deliberately excluded from `weeks`. A snapshot generated on a Tuesday would otherwise report a near-empty final week, dragging every average down and making the volume trend read as `decreasing` purely because of when the sync ran. Progress in the current week is surfaced only as the scalar `currentState.weeklyVolumeKm.currentWeek`, the run distance from `windowEnd` to `generatedAt`.

This gives two clean, non-overlapping bases, and every rule below states which it uses:

- **Aggregate rules** — `average12w`, `average4w`, frequency, consistency, long-run averages, and all three trends — read from `weeks` only, so they never see a partial week. With 12 buckets, "last 4 weeks" is `weeks[8..11]` and "preceding 8 weeks" is `weeks[0..7]`.
- **Point-in-time capability rules** — `recentActivities`, `recentTraining.longestRun`, `bestEfforts`, `currentLongestKm`, and `heartRateCoverage` — read every run from `windowStart` up to `generatedAt`, including the current partial week. A long run completed yesterday is current evidence of fitness and must not be hidden until Monday.

Accepted limitation: bucketing is UTC-based, so a late Sunday-night run in a negative UTC offset can fall into the following week. Storing a per-user timezone is out of scope.

### Empty weeks

All 12 entries in `weeks` always exist. A week with no activity is zero-filled: `runs: 0`, `distanceKm: 0`, `durationSeconds: 0`, `longestRunKm: 0`, `elevationGainMeters: 0`, `activitiesWithHeartRate: 0`, `walkCount: 0`, `walkDistanceKm: 0`, with `averagePaceSecondsPerKm`, `averageHeartRate`, and `totalSufferScore` omitted.

This is required: without it a two-week injury gap is invisible to the model.

### Weighted averages

- `averagePaceSecondsPerKm` = `durationSeconds / distanceKm` over the week's runs. Not the mean of per-run paces, which over-weights short runs. Omitted when `distanceKm` is 0.
- `averageHeartRate` = duration-weighted mean across only the runs that report HR, i.e. `sum(hr_i * duration_i) / sum(duration_i)`. Omitted when no run has HR.
- `totalSufferScore` = sum over runs that report one. Omitted when none do.

### Volume and frequency

From `weeks`. `average12w` is the mean of all 12; `average4w` is the mean of `weeks[8..11]`. Same for `averageRunsPerWeek12w` and `averageRunsPerWeek4w`.

`currentWeek` is the total run distance from `windowEnd` to `generatedAt`. 0 on a Monday morning.

### Consistency

`weeksWithAtLeast3Runs` counts entries in `weeks` with `runs >= 3`.

`totalWeeks` counts only the entries in `weeks` that start on or after `firstActivityAt`. A user who joined three weeks ago must not read as having skipped nine weeks. When `firstActivityAt` is absent, `totalWeeks` is 0.

### Long run

- `currentLongestKm` — the longest single run in the 28 days before `generatedAt`. Uses raw activities, not `weeks`, so a long run earlier this week counts. 0 if none.
- `averageKm12w` — mean of `longestRunKm` across entries in `weeks` with `runs > 0`. 0 if no active weeks.

### Heart rate coverage

`heartRateCoverage` = runs from `windowStart` to `generatedAt` with an `averageHeartRate`, divided by total runs in that same range. 0 when there are no runs.

### Trends

All three read from `weeks` and compare `weeks[8..11]` against `weeks[0..7]`.

**Volume** — ratio of `average4w` to the mean weekly volume of the prior 8 weeks:

- `> 1.10` → `increasing`
- `< 0.90` → `decreasing`
- otherwise → `stable`
- prior period is 0 and recent period is > 0 → `increasing`
- both periods are 0 → `stable`

Always present.

**Pace** — distance-weighted average pace of each period. Lower is faster:

- `< 0.98` → `improving`
- `> 1.02` → `declining`
- otherwise → `stable`

Omitted unless both periods contain at least 3 runs.

**Heart rate** — compared as **beats per kilometre**, `averageHeartRate * paceSecondsPerKm / 60`, aggregated per period over runs with HR. Lower is more efficient:

- `< 0.97` → `improving`
- `> 1.03` → `declining`
- otherwise → `stable`

Omitted unless both periods have at least 3 runs with HR **and** HR coverage of at least 0.5 in each.

Raw average HR is deliberately not used: it moves with pace, so a faster athlete would read as declining.

### Recent activities

The 10 most recent runs from `windowStart` to `generatedAt`, newest first. Fewer if the athlete has fewer.

### Efforts and personal bests

`recentTraining.bestEfforts` and `recentTraining.longestRun` use runs from `windowStart` to `generatedAt`. `historicalPerformance.personalBests` and `historicalPerformance.longestRun` use all runs ever, and `personalBests` additionally reports `halfMarathon` (nominal 21.1 km) and `marathon` (nominal 42.195 km, matching `GOAL_DISTANCE_KM.marathon`).

Both apply the `D <= distanceKm <= D * 1.15` qualification rule and rank by `paceSecondsPerKm`. Nominal distances: 1, 3, 5, 10, and (lifetime only) 21.1 km and 42.195 km.

A key omitted from the set means no qualifying activity exists.

## Implementation

### Files

```text
src/models/AthleteSnapshot.ts          model + interfaces
src/services/snapshot/
  weeks.ts                             Monday-UTC helpers + 12-week bucketing
  efforts.ts                           estimated efforts and personal bests
  currentState.ts                      volumes, frequency, consistency, coverage, trends
  buildAthleteSnapshot.ts              pure orchestrator
  generateAthleteSnapshot.ts           impure: loads, builds, persists
```

### Pure core

```ts
// buildAthleteSnapshot.ts
export type SnapshotUser = Pick<IUserProfile,
  "birthDate" | "heightCm" | "weightKg"> & { goal?: IUserGoal };

export type SnapshotActivityInput = Pick<IActivity,
  | "type" | "startedAt" | "distanceKm" | "durationSeconds"
  | "paceSecondsPerKm" | "elevationGainMeters" | "heartRate" | "sufferScore">;

export function buildAthleteSnapshot(input: {
  user: SnapshotUser;
  activities: SnapshotActivityInput[];  // all activities ever, any order
  now: Date;
}): Omit<IAthleteSnapshot, "userId" | "createdAt">;
```

Plain inputs, not Mongoose documents, so tests need no database.

`now` is a parameter rather than a `new Date()` call, so week bucketing and trend thresholds are testable at fixed instants.

### Persistence wrapper

```ts
// generateAthleteSnapshot.ts
export async function generateAthleteSnapshot(
  userId: Types.ObjectId,
): Promise<void>;
```

Loads the user and **all** of that user's activities, then writes one document.

Activities must be loaded with `raw` and `splits` excluded — `Activity.raw` holds the entire Strava payload, and lifetime personal bests require scanning every activity. Follow the explicit-select convention of `src/services/activities/highlights.ts`:

```ts
const SNAPSHOT_SELECT =
  "type startedAt distanceKm durationSeconds paceSecondsPerKm elevationGainMeters heartRate sufferScore" as const;
```

### Sync trigger

**File:** `src/services/strava/syncActivities.ts`

After the `bulkWrite` loop completes, generate a snapshot when either:

- `upserted > 0`, or
- the user has no snapshot yet — so already-synced existing data produces a first snapshot without waiting for a new run.

Placed inside the service rather than in `src/app/api/activities/sync/route.ts`, so any future trigger (a Strava webhook, a scheduled job) gets snapshots too.

Failure to build a snapshot must not fail the sync. Log and continue; `SyncActivitiesResult` is unchanged.

### Tests

Colocated `*.test.ts` using `node:assert/strict`, run with `npx tsx`, matching `src/services/strava/mapActivity.test.ts`.

Cases that must be covered:

- **weeks** — Monday-UTC normalisation; exactly 12 buckets returned; the in-progress week is excluded from `weeks` and surfaces only as `currentWeek`; empty weeks zero-filled and present; an activity on a Monday boundary lands in the correct week; distance-weighted pace differs from the naive mean; duration-weighted HR ignores runs without HR; walks counted separately and excluded from run totals.
- **efforts** — a 5.70 km run qualifies as a 5K, a 5.80 km run does not, a 4.90 km run does not; fastest candidate wins; `estimatedTimeSeconds` derives from pace and nominal distance; missing keys when no candidate qualifies; walks never qualify.
- **currentState** — `totalWeeks` excludes weeks before `firstActivityAt`; volume trend across increasing, decreasing, stable, zero-prior, and all-zero inputs; a snapshot generated mid-week does not report `decreasing` volume purely because the current week is partial; `currentLongestKm` includes a long run from earlier in the current week; pace trend omitted below 3 runs per period; HR trend omitted below 0.5 coverage; HR trend reads `improving` when beats-per-km falls even though raw average HR rises.
- **buildAthleteSnapshot** — an athlete with no activities produces a valid zero-filled snapshot; a missing `goal` produces a snapshot without the `goal` key; `ageYears` computed from `birthDate`.

## Out of scope

- Any AI or LLM call, prompt, or provider dependency
- Prompt serialisation of the snapshot
- Generating `Evaluation`, `TrainingPlan`, or `Workout` documents
- Refactoring `Evaluation.metrics` to reference a snapshot
- Fetching Strava per-activity detail for true `best_efforts` and splits
- Adding `goal.objective` to onboarding
- A UI page to view snapshots
- Per-user timezone storage for week boundaries
- Estimated race-time prediction (`IEstimatedRaceTimes`)
- Training-zone or intensity classification (`Activity.training`)
- Pruning or retention policy for old snapshots
