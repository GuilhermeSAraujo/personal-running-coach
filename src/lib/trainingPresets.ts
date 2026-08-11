import type { GoalType } from "@/lib/goal";
import { GOAL_TYPES } from "@/lib/goal";

export const WEEKDAY_ROLES = [
  "long_run",
  "easy",
  "intervals",
  "tempo",
  "recovery",
  "rest",
  "strength_or_rest",
  "quality",
  "quality_or_easy",
  "easy_or_rest",
  "rest_or_easy",
  "free",
] as const;

export type WeekdayRole = (typeof WEEKDAY_ROLES)[number];

export type WeekdayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type WeekTemplate = Record<WeekdayKey, WeekdayRole>;

export interface TrainingPreset {
  id: string;
  goalType: GoalType;
  name: string;
  /** Short explanation shown in onboarding. */
  summary: string;
  philosophy: string;
  weekTemplate: WeekTemplate;
  rules: string[];
}

const FIVE_K: TrainingPreset = {
  id: "5k_vdot",
  goalType: "5k",
  name: "5K — Jack Daniels / VDOT",
  summary:
    "Speed-focused week: short hard intervals midweek, a threshold/tempo day, easy runs around them, and a gradually increasing easy long run on Sunday.",
  philosophy:
    "Jack Daniels / VDOT style for 5K: intervals and repetitions are a major part of the week; quality work is short and sharp with easy recovery between hard days.",
  weekTemplate: {
    sunday: "long_run",
    monday: "easy",
    tuesday: "intervals",
    wednesday: "recovery",
    thursday: "tempo",
    friday: "easy_or_rest",
    saturday: "rest_or_easy",
  },
  rules: [
    "Sunday long run is easy and gradually increases over the weeks.",
    "Tuesday: short hard repetitions with easy recovery jogs between reps.",
    "Thursday: threshold / tempo run.",
    "Friday may be easy or rest; Saturday rest or easy.",
  ],
};

const TEN_K: TrainingPreset = {
  id: "10k_vdot",
  goalType: "10k",
  name: "10K — Jack Daniels / VDOT",
  summary:
    "Same VDOT skeleton as 5K with more aerobic volume: longer interval reps, a solid threshold/tempo day, easy runs for recovery, and a progressive Sunday long run.",
  philosophy:
    "Jack Daniels / VDOT style for 10K: similar to 5K but with more aerobic volume and longer threshold/interval work.",
  weekTemplate: {
    sunday: "long_run",
    monday: "easy",
    tuesday: "intervals",
    wednesday: "recovery",
    thursday: "tempo",
    friday: "easy",
    saturday: "rest_or_easy",
  },
  rules: [
    "Sunday long run is easy and progressively increasing.",
    "Tuesday: longer hard repetitions with easy recovery than the 5K plan.",
    "Thursday: threshold / tempo run.",
    "Friday prefers an easy run (rest less often than 5K).",
  ],
};

const HALF: TrainingPreset = {
  id: "half_marathon_time_long",
  goalType: "half_marathon",
  name: "Half marathon — time-based long",
  summary:
    "Sunday long by time (start 60′, hold 2 weeks, then +10′). Monday easy ~6k. Tue/Thu strength (no run). Wednesday hard 10k effort. Friday very easy/chill. Saturday free.",
  philosophy:
    "Half-marathon structure built around a time-progressed Sunday long run, one midweek all-out 10k quality day, easy volume, and dedicated strength/rest days.",
  weekTemplate: {
    sunday: "long_run",
    monday: "easy",
    tuesday: "strength_or_rest",
    wednesday: "tempo",
    thursday: "strength_or_rest",
    friday: "easy",
    saturday: "free",
  },
  rules: [
    "Sunday longest run tracked by running TIME, not distance.",
    "Long-run progression: weeks 1–2 at 60 minutes; weeks 3–4 at 70 minutes; then increase by 10 minutes and repeat each duration for 2 weeks.",
    "Monday: easy run about 6 km.",
    "Tuesday and Thursday: no run — strength / workout day (prescribe type rest with coaching notes about strength).",
    "Wednesday: 10 km as hard / fastest as possible — give everything in the session.",
    "Friday: very easy run at the athlete’s preferred chill pace.",
    "Saturday: free (rest or optional very easy).",
  ],
};

const MARATHON: TrainingPreset = {
  id: "marathon_first",
  goalType: "marathon",
  name: "Marathon — first marathon endurance",
  summary:
    "Endurance-first week: progressive Sunday long run, lots of easy/recovery running, and controlled quality (threshold or marathon-pace) rather than frequent all-outs.",
  philosophy:
    "Jack Daniels “Finish Your First Marathon” style: emphasis on easy volume, a progressively longer long run, and controlled quality sessions.",
  weekTemplate: {
    sunday: "long_run",
    monday: "recovery",
    tuesday: "quality",
    wednesday: "easy",
    thursday: "quality_or_easy",
    friday: "easy_or_rest",
    saturday: "rest_or_easy",
  },
  rules: [
    "Sunday is the longest run and increases progressively over the weeks.",
    "Tuesday quality: usually threshold or marathon-pace work.",
    "Thursday may be a second quality session or an easy run depending on fatigue.",
    "Prefer easy volume and controlled quality over frequent all-out efforts.",
    "Saturday rest or very easy.",
  ],
};

export const TRAINING_PRESETS: Record<GoalType, TrainingPreset> = {
  "5k": FIVE_K,
  "10k": TEN_K,
  half_marathon: HALF,
  marathon: MARATHON,
};

export function getTrainingPreset(goalType: GoalType): TrainingPreset {
  const preset = TRAINING_PRESETS[goalType];
  if (!preset) {
    throw new Error(`No training preset for goal type: ${String(goalType)}`);
  }
  return preset;
}

/** Snapshot-safe copy (plain object) of the catalog entry for a goal. */
export function resolveTrainingPresetForSnapshot(
  goalType: GoalType,
): TrainingPreset {
  return structuredClone(getTrainingPreset(goalType));
}

export function assertAllGoalsHavePresets(): void {
  for (const type of GOAL_TYPES) {
    getTrainingPreset(type);
  }
}
