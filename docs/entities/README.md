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
  shared.ts          # enums, GOAL_DISTANCE_KM, heartRateSchema
  User.ts
  Activity.ts
  AthleteSnapshot.ts
  SessionPlan.ts
  DailyCoachMessage.ts
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
- **Collections:** `users`, `activities`, `athlete_snapshots`, `session_plans`, `daily_coach_messages` (explicit `collection` option)
- **Refs:** `Schema.Types.ObjectId` with `ref`
- **Timestamps:** `timestamps: true` on User and Activity; `createdAt` only (`updatedAt: false`) on AthleteSnapshot, SessionPlan, and DailyCoachMessage
- **Enums:** string unions in TypeScript + matching `enum: [...]` arrays in schemas

---

## Collections

### User (`users`)

Stable athlete state: Strava credentials, profile, goal, and training style.

- `strava`: `athleteId`, `accessToken`, `refreshToken`, `expiresAt`
- `profile`: `name`, `email`; optional `heightCm` / `weightKg` (filled during onboarding), `birthDate`, `current5kTime`, `longestRunKm`
- `goal` (optional until onboarding): `type` (`5k` \| `10k` \| `half_marathon` \| `marathon`), `distanceKm`, `targetTimeSeconds`, `targetDate`

**Onboarding:** incomplete while `goal.type` is missing (blocking modal). Only `goal.type` is required from the user; omitted `targetTimeSeconds` / `targetDate` are filled server-side (amateur defaults: 5k/10k +3 months, half +4, marathon +5). Optional profile fields are written only when provided.

**Index:** unique on `strava.athleteId`

`GOAL_DISTANCE_KM` in `shared.ts` / `src/lib/goal.ts` maps goal types to distances for the UI → domain conversion.

### Activity (`activities`)

Normalized facts of what the athlete did (not raw Strava shape).

- Required: `userId`, `stravaActivityId`, `type` (`run` \| `walk`), `startedAt`, `distanceKm`, `durationSeconds`, `paceSecondsPerKm`, `elevationGainMeters`, `source` (default `"strava"`)
- Optional: `heartRate`, `cadence`, `splits`, `training` (`estimatedZone`, `intensity`), `raw` (`Mixed`)

**Indexes:** `{ userId, startedAt: -1 }`; unique `{ userId, stravaActivityId }`

---

## Relationships

```text
User
 ├── Activities
 ├── AthleteSnapshots
 ├── SessionPlans
 └── DailyCoachMessages

AthleteSnapshot ──feeds──► SessionPlan ──sessions match──► Activity
```

---

## Shared module

[`src/models/shared.ts`](../../src/models/shared.ts) exports:

- Enum const arrays and union types (`GoalType`, `ActivityType`, `SessionType`, `SegmentKind`)
- `GOAL_DISTANCE_KM`
- Reusable schemas: `heartRateSchema`

---

## Out of scope (not implemented)

- Repositories, coaching / metrics / AI services, Strava sync
- Auth.js MongoDB adapter / session ↔ `User` linking
- Migrations, seeds
