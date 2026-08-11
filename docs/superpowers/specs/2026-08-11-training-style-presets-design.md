# Training Style Presets — Design

Date: 2026-08-11

## Goal

During onboarding, let the athlete choose a training style: either a goal-tied structured weekly preset (with explanation) or fully adaptive AI coaching. Persist the choice and cascade it into every session-plan generation via the athlete snapshot.

## Approach

Static preset catalog keyed by `GoalType`. Store `User.trainingStyle` (`preset` | `adaptive`). When building an `AthleteSnapshot`, embed `trainingStyle` and (if preset) the resolved catalog object. `generateNextSessions` soft-guides the model with a preset JSON block or an adaptive one-liner. No hard weekday validators.

## Data cascade

```text
OnboardingModal (style step)
  → PATCH /api/user/onboarding { trainingStyle }
  → User.trainingStyle
  → buildAthleteSnapshot embeds trainingStyle + trainingPreset?
  → generateNextSessions soft prompt block
```

## Onboarding UI

Three steps:

1. **Goal** — unchanged (race distance + optional time/date).
2. **Training style** (new) — two required options:
   - **Preset** — title + short explanation from that goal’s catalog entry.
   - **Adaptive to my needs** — AI owns the full week from fitness, history, and feedback.
3. **Profile** — optional fields (unchanged).

Rules:

- Style selection required before Continue.
- Changing goal refreshes preset copy; keeps the same `preset` vs `adaptive` choice if already selected.
- Incomplete-onboarding gate remains `!user.goal?.type` (no forced re-onboarding for legacy users without `trainingStyle`).

## Data model

### User

```ts
trainingStyle?: "preset" | "adaptive"
```

Required on new onboarding. Legacy missing → treat as `adaptive` at snapshot time.

### Catalog (`src/lib/trainingPresets.ts`)

One entry per goal with: `id`, `goalType`, `name`, `summary` (UI), `philosophy`, `weekTemplate` (Mon–Sun roles), `rules` (progression / special notes).

### AthleteSnapshot

- Always set `trainingStyle` (`adaptive` if User field missing).
- When `preset` and goal present: embed resolved `trainingPreset` object.
- When `adaptive`: omit `trainingPreset`.

## Preset contents

Weekday roles are soft preferences. Strength / free days map to `rest` (or easy) with coaching notes — no new session type.

### 5K — Jack Daniels / VDOT (speed)

Sun long easy ↑ · Mon easy · Tue short intervals · Wed easy/recovery · Thu threshold/tempo · Fri easy or rest · Sat rest or easy.

### 10K — Jack Daniels / VDOT (speed + volume)

Same skeleton as 5K with longer interval reps and more aerobic volume; Fri prefers easy.

### Half marathon — time-based long + midweek quality

- Sun: long by **time** — weeks 1–2: 60′, weeks 3–4: 70′, then +10′ every 2 weeks.
- Mon: easy ~6k · Tue: no run, strength · Wed: hard 10k effort · Thu: no run, strength · Fri: very easy, athlete’s chill pace · Sat: free.

### Marathon — first-marathon endurance

Sun longest ↑ · Mon easy/recovery · Tue quality (threshold or MP) · Wed easy · Thu quality or easy · Fri easy/recovery or rest · Sat rest or very easy. Emphasis on easy volume, progressive long, controlled quality.

## AI binding (soft)

- System instruction: if a training preset is present, prefer its weekday roles and progression; still adapt for fatigue, feedback, continuity, and safety.
- User message: `Estilo de treino / Preset (JSON): …` when preset; adaptive one-liner when adaptive.
- Continuity still wins softly mid-week; preset mainly shapes open days and fresh weeks.
- Map preset weekdays onto UTC calendar dates in the rolling plan window.
- No post-AI weekday assertions.

## API

`PATCH /api/user/onboarding` requires `trainingStyle` (`preset` | `adaptive`) alongside `goal.type`. Rejects unknown values. `$set`s `trainingStyle` with `goal`.

## Out of scope

- Editing style after onboarding / settings screen
- Multiple presets per goal
- Hard enforcement or VDOT pace tables in code
- New session types for strength
- Re-prompting existing users to pick a style
