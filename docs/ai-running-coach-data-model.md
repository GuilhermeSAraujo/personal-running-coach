# AI Running Coach — Data Model & Architecture

> **Status (2026-08-18):** Collections `evaluations`, `training_plans`, and `workouts` were designed here but never created, updated, or read in application code. Live coaching uses `AthleteSnapshot` and `SessionPlan` instead. This document is historical.

## 1. Product concept

The application should be modeled as an **AI running coach**, not simply as "Strava activities + summaries".

The core loop is:

```text
facts → metrics → assessment → prescription → execution → reassessment
```

Or, more concretely:

```text
User
 │
 ├── Profile
 ├── Goal
 ├── Activities
 │      │
 │      ▼
 │   Athlete Metrics
 │      │
 │      ▼
 │   AI Evaluation
 │      │
 │      ▼
 │   Training Plan
 │      │
 │      ▼
 │   Planned Workouts
 │
 └──────────────────────────────┐
                                │
                                └── new activities → reassessment
```

The system should maintain an evolving understanding of the athlete while keeping objective activity data separate from AI-generated interpretation.

---

# 2. Main collections

The initial MongoDB/Mongoose model should contain five main collections:

```text
users
activities
evaluations
training_plans
workouts
```

There is no need for a separate `goals` collection because the user's goal is fixed for the coaching journey.

The goal belongs to the user.

---

# 3. User

The `User` document should contain relatively stable/current information.

Example:

```ts
User {
  _id

  strava: {
    athleteId
    accessToken
    refreshToken
    expiresAt
  }

  profile: {
    name
    email

    birthDate?
    heightCm
    weightKg

    current5kTime?
    longestRunKm?
  }

  goal: {
    type
    targetRaceDate?
    targetTime?
  }

  coaching: {
    activitiesSinceLastEvaluation
    currentEvaluationId?
    currentTrainingPlanId?
  }

  createdAt
  updatedAt
}
```

## Historical profile information

The application does **not** need to preserve historical profile values.

For example:

```text
weight = 67kg
       ↓
weight = 65kg
```

The user simply becomes:

```ts
profile.weightKg = 65
```

Historical athlete state is instead captured by immutable evaluations.

This is more useful because an evaluation records the athlete's complete relevant state at a specific point in time.

---

# 4. Goal

The goal is fixed, so it should be part of the `User` document rather than a separate collection.

A useful representation is:

```ts
goal: {
  type: "5k" | "10k" | "half_marathon" | "marathon"

  targetRaceDate: Date

  targetTimeSeconds: number
}
```

An even more domain-oriented representation is:

```ts
goal: {
  distanceKm: number
  targetTimeSeconds: number
  targetDate: Date
}
```

For example, a half marathon in 1h45:

```json
{
  "distanceKm": 21.1,
  "targetTimeSeconds": 6300,
  "targetDate": "2026-11-15"
}
```

The UI can still expose friendly goal types such as `half_marathon`, while the coaching engine primarily works with distance and target time.

---

# 5. Activities

The `Activity` collection contains the objective record of what the athlete actually did.

Do not make the application depend directly on the Strava response format.

Instead, normalize Strava data into your own domain model.

Example:

```ts
Activity {
  _id

  userId

  stravaActivityId

  type: "run" | "walk"

  startedAt

  distanceKm
  durationSeconds
  paceSecondsPerKm

  elevationGainMeters

  heartRate: {
    average?
    max?
  }

  cadence?

  splits?

  training: {
    estimatedZone?
    intensity?
  }

  source: "strava"

  raw?: Mixed

  createdAt
  updatedAt
}
```

## Why normalize Strava data?

Strava might provide:

```text
moving_time
elapsed_time
distance
average_speed
average_heartrate
max_heartrate
total_elevation_gain
```

Your application should transform that into its own representation:

```text
distanceKm
durationSeconds
paceSecondsPerKm
elevationGainMeters
heartRate.average
heartRate.max
```

This keeps the coaching engine independent from Strava.

If the data provider changes later, the rest of the system does not need to change.

You can optionally keep the original Strava payload in a `raw` field for debugging or future migration, but application logic should use the normalized fields.

---

# 6. Activities are facts

An activity represents something that actually happened:

```text
"I ran 6.3km on August 3."
```

It should not contain derived global athlete statistics such as:

```text
weeklyMileage
consistency
currentRacePrediction
```

Those are derived metrics.

For example:

```text
Activity #1 = 6km
Activity #2 = 7km
Activity #3 = 5km

Weekly mileage = 18km
```

`18km` is not a property of any individual activity.

---

# 7. Athlete Metrics

Metrics should be calculated from activities rather than stored as permanent properties of individual activities.

Relevant metrics include:

```ts
{
  weeklyMileageKm
  longestRunKm

  averageRunsPerWeek
  consistency

  easyVolumePercentage

  estimatedRaceTimes: {
    "5k"
    "10k"
    "halfMarathon"
    "marathon"
  }
}
```

These metrics can be calculated whenever an evaluation is created.

For example:

```json
{
  "weeklyMileageKm": 23.4,
  "longestRunKm": 11.2,
  "averageRunsPerWeek": 3.2,
  "consistency": 0.87,
  "easyVolumePercentage": 0.68,
  "estimatedRaceTimes": {
    "5k": 1530,
    "10k": 3180,
    "halfMarathon": 7080
  }
}
```

Initially, these metrics do not need their own collection.

They can be stored as a snapshot inside an evaluation.

---

# 8. Evaluations

The `Evaluation` collection is the historical brain of the coaching system.

Every three activities, create a new immutable evaluation.

Example:

```ts
Evaluation {
  _id

  userId

  period: {
    activities: [activityId]

    startedAt
    endedAt
  }

  metrics: {
    weeklyMileageKm
    longestRunKm
    consistency
    easyVolumePercentage

    estimatedRaceTimes: {
      "5k"
      "10k"
      "halfMarathon"
      "marathon"
    }
  }

  goalAssessment: {
    estimatedGoalTime
    targetTime
    gapSeconds

    readiness
  }

  analysis: {
    strengths: []
    weaknesses: []
    progress: []
    concerns: []
  }

  recommendations: []

  createdAt
}
```

Evaluations should be **immutable**.

Once generated, do not update them.

---

# 9. Evaluation timeline

The athlete's progression can then be represented as a timeline:

```text
Evaluation #1
────────────────────────────
Longest run: 8km
Weekly volume: 18km
Estimated HM: 2:12
Z2: 54%
Consistency: 72%

AI:
"Your aerobic base is still developing."

Recommendations:
- increase long run
- maintain 3 runs/week
- increase easy mileage


Evaluation #2
────────────────────────────
Longest run: 10km
Weekly volume: 21km
Estimated HM: 2:05
Z2: 64%
Consistency: 85%

AI:
"Your aerobic capacity is improving."

Recommendations:
- progress long run to 12km
- introduce threshold session
- maintain easy volume


Evaluation #3
────────────────────────────
Longest run: 12km
Weekly volume: 25km
Estimated HM: 1:58
Z2: 71%
Consistency: 91%

AI:
"You're progressing faster than expected."

Recommendations:
- ...
```

This is much more valuable than storing one mutable `summary` field on the user.

---

# 10. Training Plans

Because the AI should prescribe actual workouts, evaluations and training plans should be separate concepts.

An evaluation answers:

> Where is the athlete?

A training plan answers:

> What should the athlete do next?

Example:

```ts
TrainingPlan {
  _id

  userId

  evaluationId

  status: "active" | "completed" | "cancelled"

  startDate
  endDate

  objective

  createdAt
  updatedAt
}
```

Example flow:

```text
Evaluation #12
      ↓
AI determines:
"User needs more threshold work"
      ↓
Training Plan #13
      ↓
Mon: Rest
Tue: 6km easy Z2
Thu: 4 × 1km threshold
Sat: 12km long run
```

The training plan is therefore a direct consequence of an evaluation.

---

# 11. Workouts

I would make individual workouts their own collection because they need to track execution.

Example:

```ts
Workout {
  _id

  userId
  trainingPlanId

  scheduledDate

  type:
    "easy"
    | "long_run"
    | "tempo"
    | "interval"
    | "recovery"
    | "race"

  target: {
    distanceKm?
    durationMinutes?

    paceMinPerKm?
    paceMaxPerKm?

    heartRateZone?
  }

  description

  status:
    "scheduled"
    | "completed"
    | "missed"
    | "skipped"

  activityId?

  createdAt
  updatedAt
}
```

This creates an important relationship:

```text
Workout ───────► Activity
```

A prescribed workout can eventually be matched with the Strava activity that the athlete actually completed.

---

# 12. Workout adherence

Once workouts are connected to activities, the AI can evaluate whether the athlete followed the plan.

For example:

```text
AI prescribed:

Thursday:
5 × 800m @ 4:50/km

        ↓

User runs

        ↓

Strava activity

        ↓

Match Activity ↔ Workout

        ↓

Completed as planned?
```

The next evaluation can then say:

> You completed 5/6 prescribed workouts. Your interval pace improved by 8 sec/km, but your long runs are consistently slower than planned.

This is what turns the application from an activity analyzer into an actual coach.

---

# 13. AI responsibilities

The AI should be responsible for:

## Interpretation

```text
"What does this data mean?"
```

## Decision

```text
"What should we focus on?"
```

## Prescription

```text
"What workouts should the athlete do?"
```

The AI should **not** be responsible for basic calculations such as:

```text
Calculate weekly mileage.
Calculate longest run.
Calculate pace.
Calculate consistency.
Calculate race prediction.
```

Those should be deterministic backend calculations.

The AI interprets objective metrics rather than inventing them.

This makes the system more reliable and testable.

---

# 14. AI Context Builder

The AI should not receive hundreds of raw Strava activities every time.

Instead, create a dedicated service that builds a structured coaching context.

For example:

```ts
const context = buildAthleteContext(userId)
```

Which produces something like:

```json
{
  "athlete": {
    "age": 24,
    "weightKg": 67,
    "heightCm": 178
  },

  "goal": {
    "distanceKm": 21.1,
    "targetTimeSeconds": 6300,
    "targetDate": "2026-11-15"
  },

  "currentMetrics": {
    "weeklyMileageKm": 24.5,
    "longestRunKm": 11.3,
    "consistency": 0.88,
    "easyVolumePercentage": 0.71,
    "estimatedHalfMarathonSeconds": 7020
  },

  "recentActivities": [],

  "recentWorkouts": [],

  "previousEvaluation": {}
}
```

The AI receives a concise, structured representation of the athlete instead of having to derive everything from raw database records.

---

# 15. Coaching pipeline

When the third new activity arrives:

```ts
await activityService.save(activity)

const count =
  await activityService.countSinceLastEvaluation(userId)

if (count >= 3) {
  await coachingService.evaluate(userId)
}
```

The evaluation flow can be:

```ts
async function evaluate(userId) {
  const user =
    await userRepository.get(userId)

  const activities =
    await activityRepository.getSinceLastEvaluation(userId)

  const metrics =
    await metricsService.calculate(userId)

  const context =
    await coachingContextService.build({
      user,
      activities,
      metrics
    })

  const evaluation =
    await aiCoach.evaluate(context)

  await evaluationRepository.create({
    userId,
    metrics,
    analysis: evaluation
  })

  const trainingPlan =
    await aiCoach.generateTrainingPlan(
      context,
      evaluation
    )

  await trainingPlanRepository.create(trainingPlan)
}
```

This creates a clean separation between:

```text
data collection
    ↓
metric calculation
    ↓
AI assessment
    ↓
training prescription
```

---

# 16. Evaluation trigger

The initial rule is:

```text
Every 3 activities
```

However, the system should avoid hardcoding this rule everywhere.

Instead, consider something like:

```ts
coaching: {
  evaluationActivityThreshold: 3
}
```

And eventually:

```ts
evaluationTriggerService.shouldEvaluate(user)
```

This makes it possible to support future triggers such as:

```text
3 new activities
OR
new personal record
OR
race completed
OR
14 days without activity
OR
goal date approaching
```

These additional triggers do not need to be implemented initially.

The important part is keeping the evaluation trigger behind a service rather than scattering `if (activities.length === 3)` throughout the codebase.

---

# 17. Running and walking

The application supports running and walking, but it is not intended to become a generic multi-sport platform.

Activities should therefore have:

```ts
type: "run" | "walk"
```

Metrics can then decide what counts toward each calculation.

For example:

```text
Weekly running mileage
→ running only

Longest run
→ running only

Running consistency
→ running only

General activity
→ running + walking

Recovery behavior
→ potentially both
```

This keeps the domain simple while still correctly handling walking activities from Strava.

---

# 18. Database relationships

The overall data model becomes:

```text
                     ┌─────────────┐
                     │    User     │
                     └──────┬──────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
          Profile         Goal        Activities
                                           │
                                           ▼
                                      ┌───────────┐
                                      │ Evaluation│
                                      └─────┬─────┘
                                            │
                                            ▼
                                      Training Plan
                                            │
                                            ▼
                                        Workouts
                                            │
                                            │
                                            ▼
                                      Strava Activity
```

More explicitly:

```text
User
 ├── Activities
 ├── Evaluations
 ├── Training Plans
 └── Workouts

Evaluation
 ├── references User
 ├── references Activities
 └── produces Training Plan

Training Plan
 ├── references User
 ├── references Evaluation
 └── contains/produces Workouts

Workout
 ├── references User
 ├── references Training Plan
 └── optionally references completed Activity
```

---

# 19. Suggested Mongoose indexes

## Activities

The most important index:

```ts
{
  userId: 1,
  startedAt: -1
}
```

This makes retrieving recent activities for a user efficient.

Also enforce unique Strava activities:

```ts
{
  userId: 1,
  stravaActivityId: 1
}
```

with a unique constraint.

This prevents duplicate activities during synchronization.

## Evaluations

```ts
{
  userId: 1,
  createdAt: -1
}
```

Useful for retrieving the latest evaluation.

## Workouts

```ts
{
  userId: 1,
  scheduledDate: 1
}
```

Useful for the user's upcoming training schedule.

---

# 20. Suggested Next.js project structure

A clean initial structure could be:

```text
src/
  models/
    User.ts
    Activity.ts
    Evaluation.ts
    TrainingPlan.ts
    Workout.ts

  services/
    strava/
      StravaService.ts
      StravaSyncService.ts

    coaching/
      CoachingService.ts
      EvaluationService.ts
      TrainingPlanService.ts
      CoachingContextService.ts

    metrics/
      MetricsService.ts
      RacePredictionService.ts
      ConsistencyService.ts

  ai/
    Coach.ts
    prompts/
      evaluation.ts
      training-plan.ts

  repositories/
    UserRepository.ts
    ActivityRepository.ts
    EvaluationRepository.ts
    TrainingPlanRepository.ts
    WorkoutRepository.ts
```

The exact folder structure can change depending on the architecture of the Next.js application, but these conceptual boundaries are useful.

---

# 21. Final mental model

The system can be understood as six layers.

## User

**Who is the athlete?**

```text
Profile
Goal
Strava connection
```

## Activity

**What did they actually do?**

```text
Strava → normalized activity
```

## Metrics

**What does the objective data say?**

```text
Weekly mileage
Longest run
Z2 volume
Consistency
Race prediction
```

## Evaluation

**What does the coach think about it?**

```text
Progress
Strengths
Weaknesses
Risks
Goal trajectory
```

## Training Plan

**What should they do next?**

```text
Weekly structure
```

## Workout

**What exactly should they do today?**

```text
6km Z2
4 × 1km threshold
12km long run
...
```

Then the cycle repeats:

```text
             ┌─────────────────────────┐
             │                         │
             ▼                         │
        ACTIVITY DATA                 │
             │                         │
             ▼                         │
          METRICS                     │
             │                         │
             ▼                         │
        AI EVALUATION                 │
             │                         │
             ▼                         │
       TRAINING PLAN                  │
             │                         │
             ▼                         │
          WORKOUT                     │
             │                         │
             ▼                         │
       ATHLETE RUNS                   │
             │                         │
             └─────────────────────────┘
```

## Core principle

> **Keep objective data factual, keep evaluations immutable, calculate metrics deterministically, and let AI interpret the data and prescribe the next actions.**

This creates a system where the AI is not merely generating summaries. It is participating in a continuous feedback loop:

```text
"What happened?"
      ↓
"How is the athlete doing?"
      ↓
"Are they progressing toward the goal?"
      ↓
"What should they do next?"
      ↓
"Did they follow the prescription?"
      ↓
"Did it work?"
      ↓
"What should change?"
```

That feedback loop is effectively the core product.
