# Mongoose Entities

Documentation for the MongoDB/Mongoose models implemented under [`src/models/`](../../src/models/). This reflects the approved design decisions from the data model brainstorm and the Mongoose Entities plan.

Source of truth for product concepts: [`../ai-running-coach-data-model.md`](../ai-running-coach-data-model.md).

---

## Decisions

| Decision | Choice |
| --- | --- |
| Scope | Models + hand-written TypeScript interfaces (no repositories or services) |
| Location | Flat `src/models/`; connection helper stays in `src/lib/db.ts` |
| Goal shape | Both friendly `type` and domain fields (`distanceKm`, `targetTimeSeconds`, `targetDate`) |
| File organization | One file per collection + `shared.ts` + barrel `index.ts` |
| Typing | Hand-written interfaces aligned with schemas (not `InferSchemaType`) |
| Auth | Domain `User` with Strava tokens; Auth.js MongoDB adapter not wired yet |

---

## Layout

```text
src/models/
  shared.ts          # enums, GOAL_DISTANCE_KM, shared subdocs
  User.ts
  Activity.ts
  Evaluation.ts
  TrainingPlan.ts
  Workout.ts
  index.ts           # barrel re-exports
```

Import via path aliases:

```ts
import { dbConnect } from "@/lib/db";
import { User, Activity, type IUser } from "@/models";
```

Models never call `dbConnect`; callers must connect first.

---

## Conventions

- **HMR-safe registration:** `mongoose.models.X ?? mongoose.model<IX>("X", Schema)`
- **Collections:** `users`, `activities`, `evaluations`, `training_plans`, `workouts` (explicit `collection` option)
- **Refs:** `Schema.Types.ObjectId` with `ref`
- **Timestamps:** `timestamps: true` on User, Activity, TrainingPlan, Workout; Evaluation uses `createdAt` only (`updatedAt: false`) for write-once semantics
- **Enums:** string unions in TypeScript + matching `enum: [...]` arrays in schemas

---

## Collections

### User (`users`)

Stable athlete state: Strava credentials, profile, goal, and coaching pointers.

- `strava`: `athleteId`, `accessToken`, `refreshToken`, `expiresAt`
- `profile`: `name`, `email`; optional `heightCm` / `weightKg` (filled during onboarding), `birthDate`, `current5kTime`, `longestRunKm`
- `goal` (optional until onboarding): `type` (`5k` \| `10k` \| `half_marathon` \| `marathon`), `distanceKm`, `targetTimeSeconds`, `targetDate`
- `coaching`: `activitiesSinceLastEvaluation` (default `0`), `evaluationActivityThreshold` (default `3`), optional `currentEvaluationId` / `currentTrainingPlanId`

**Onboarding:** incomplete while `goal.type` is missing (blocking modal). Only `goal.type` is required from the user; omitted `targetTimeSeconds` / `targetDate` are filled server-side (amateur defaults: 5k/10k +3 months, half +4, marathon +5). Optional profile fields are written only when provided.

**Index:** unique on `strava.athleteId`

`GOAL_DISTANCE_KM` in `shared.ts` / `src/lib/goal.ts` maps goal types to distances for the UI → domain conversion.

### Activity (`activities`)

Normalized facts of what the athlete did (not raw Strava shape).

- Required: `userId`, `stravaActivityId`, `type` (`run` \| `walk`), `startedAt`, `distanceKm`, `durationSeconds`, `paceSecondsPerKm`, `elevationGainMeters`, `source` (default `"strava"`)
- Optional: `heartRate`, `cadence`, `splits`, `training` (`estimatedZone`, `intensity`), `raw` (`Mixed`)

**Indexes:** `{ userId, startedAt: -1 }`; unique `{ userId, stravaActivityId }`

### Evaluation (`evaluations`)

Immutable coaching snapshot (created every N activities; threshold lives on the user).

- `period`: activity refs + `startedAt` / `endedAt`
- `metrics`: embedded `IAthleteMetrics` (weekly mileage, longest run, consistency, easy volume %, estimated race times)
- `goalAssessment`: estimated vs target time, gap, readiness
- `analysis`: strengths / weaknesses / progress / concerns
- `recommendations`: string array

**Index:** `{ userId, createdAt: -1 }`

Immutability is a service-layer rule later; the schema is create-oriented only.

### TrainingPlan (`training_plans`)

Prescription produced from an evaluation.

- `userId`, `evaluationId`, `status` (`active` \| `completed` \| `cancelled`), `startDate`, `endDate`, `objective`

### Workout (`workouts`)

Individual scheduled sessions under a plan; optionally linked to a completed activity.

- `userId`, `trainingPlanId`, `scheduledDate`, `type`, `target`, `description`, `status`, optional `activityId`
- Types: `easy` \| `long_run` \| `tempo` \| `interval` \| `recovery` \| `race`
- Statuses: `scheduled` \| `completed` \| `missed` \| `skipped`
- `target`: optional distance, duration, pace range, heart-rate zone

**Index:** `{ userId, scheduledDate: 1 }`

---

## Relationships

```text
User
 ├── Activities
 ├── Evaluations
 ├── Training Plans
 └── Workouts

Evaluation ──produces──► TrainingPlan ──contains──► Workout
Workout ──optionally matches──► Activity
```

---

## Shared module

[`src/models/shared.ts`](../../src/models/shared.ts) exports:

- Enum const arrays and union types (`GoalType`, `ActivityType`, `WorkoutType`, etc.)
- `GOAL_DISTANCE_KM`
- Reusable schemas: `athleteMetricsSchema`, `estimatedRaceTimesSchema`, `heartRateSchema`

---

## Out of scope (not implemented)

- Repositories, coaching / metrics / AI services, Strava sync
- Auth.js MongoDB adapter / session ↔ `User` linking
- Migrations, seeds, Evaluation immutability middleware
