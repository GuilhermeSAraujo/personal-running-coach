import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import {
  ATHLETE_EFFORTS,
  type IAthleteFeedback,
} from "./Activity";
import { GOAL_TYPES, type GoalType } from "./shared";
import {
  TRAINING_STYLES,
  type TrainingStyle,
} from "@/lib/trainingStyle";
import type { TrainingPreset } from "@/lib/trainingPresets";

export const ATHLETE_SNAPSHOT_SCHEMA_VERSION = 1;

export interface IWeeklyTraining {
  weekStart: Date;
  runs: number;
  distanceKm: number;
  durationSeconds: number;
  longestRunKm: number;
  averagePaceSecondsPerKm?: number;
  averageHeartRate?: number;
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
  athleteFeedback?: IAthleteFeedback;
}

export interface IEstimatedEffort {
  nominalDistanceKm: number;
  actualDistanceKm: number;
  actualTimeSeconds: number;
  paceSecondsPerKm: number;
  estimatedTimeSeconds: number;
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
    currentWeek: number;
  };
  frequency: {
    averageRunsPerWeek12w: number;
    averageRunsPerWeek4w: number;
  };
  longRun: {
    currentLongestKm: number;
    averageKm12w: number;
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
  heartRateCoverage: number;
}

export interface IAthleteSnapshotProfile {
  ageYears?: number;
  weightKg?: number;
  heightCm?: number;
  firstActivityAt?: Date;
  lifetimeRunCount: number;
}

export interface IAthleteSnapshotGoal {
  type: GoalType;
  distanceKm: number;
  targetTimeSeconds: number;
  targetDate: Date;
  weeksUntilTarget: number;
}

export interface IAthleteSnapshot {
  userId: Types.ObjectId;
  schemaVersion: number;
  generatedAt: Date;
  windowStart: Date;
  windowEnd: Date;
  profile: IAthleteSnapshotProfile;
  goal?: IAthleteSnapshotGoal;
  trainingStyle: TrainingStyle;
  /** Present when trainingStyle is preset and a goal is known. */
  trainingPreset?: TrainingPreset;
  recentTraining: {
    weeks: IWeeklyTraining[];
    recentActivities: ISnapshotActivity[];
    longestRun?: ISnapshotActivity;
    bestEfforts: IEstimatedEffortSet;
  };
  historicalPerformance: {
    personalBests: IPersonalBestSet;
    longestRun?: ISnapshotActivity;
    lifetimeDistanceKm: number;
    lifetimeRuns: number;
  };
  currentState: ICurrentState;
  /**
   * Compact labeled-text athlete context sent to the LLM (debug / replay).
   * Set at plan-generation time; never duplicate rich snapshot JSON in the prompt.
   */
  promptText?: string;
  createdAt: Date;
}

export type AthleteSnapshotDocument = HydratedDocument<IAthleteSnapshot>;

const weeklyTrainingSchema = new Schema<IWeeklyTraining>(
  {
    weekStart: { type: Date, required: true },
    runs: { type: Number, required: true },
    distanceKm: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
    longestRunKm: { type: Number, required: true },
    averagePaceSecondsPerKm: { type: Number },
    averageHeartRate: { type: Number },
    activitiesWithHeartRate: { type: Number, required: true },
    elevationGainMeters: { type: Number, required: true },
    totalSufferScore: { type: Number },
    walkCount: { type: Number, required: true },
    walkDistanceKm: { type: Number, required: true },
  },
  { _id: false },
);

const snapshotAthleteFeedbackSchema = new Schema<IAthleteFeedback>(
  {
    effort: { type: String, enum: ATHLETE_EFFORTS },
    notes: { type: String },
  },
  { _id: false },
);

const snapshotActivitySchema = new Schema<ISnapshotActivity>(
  {
    date: { type: Date, required: true },
    distanceKm: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
    paceSecondsPerKm: { type: Number, required: true },
    elevationGainMeters: { type: Number, required: true },
    averageHeartRate: { type: Number },
    maxHeartRate: { type: Number },
    sufferScore: { type: Number },
    athleteFeedback: { type: snapshotAthleteFeedbackSchema },
  },
  { _id: false },
);

const estimatedEffortSchema = new Schema<IEstimatedEffort>(
  {
    nominalDistanceKm: { type: Number, required: true },
    actualDistanceKm: { type: Number, required: true },
    actualTimeSeconds: { type: Number, required: true },
    paceSecondsPerKm: { type: Number, required: true },
    estimatedTimeSeconds: { type: Number, required: true },
    date: { type: Date, required: true },
    averageHeartRate: { type: Number },
  },
  { _id: false },
);

const estimatedEffortSetSchema = new Schema<IEstimatedEffortSet>(
  {
    "1k": { type: estimatedEffortSchema },
    "3k": { type: estimatedEffortSchema },
    "5k": { type: estimatedEffortSchema },
    "10k": { type: estimatedEffortSchema },
  },
  { _id: false },
);

const personalBestSetSchema = new Schema<IPersonalBestSet>(
  {
    "1k": { type: estimatedEffortSchema },
    "3k": { type: estimatedEffortSchema },
    "5k": { type: estimatedEffortSchema },
    "10k": { type: estimatedEffortSchema },
    halfMarathon: { type: estimatedEffortSchema },
    marathon: { type: estimatedEffortSchema },
  },
  { _id: false },
);

const currentStateSchema = new Schema<ICurrentState>(
  {
    weeklyVolumeKm: {
      average12w: { type: Number, required: true },
      average4w: { type: Number, required: true },
      currentWeek: { type: Number, required: true },
    },
    frequency: {
      averageRunsPerWeek12w: { type: Number, required: true },
      averageRunsPerWeek4w: { type: Number, required: true },
    },
    longRun: {
      currentLongestKm: { type: Number, required: true },
      averageKm12w: { type: Number, required: true },
    },
    consistency: {
      weeksWithAtLeast3Runs: { type: Number, required: true },
      totalWeeks: { type: Number, required: true },
    },
    trends: {
      volume: {
        type: String,
        enum: ["increasing", "stable", "decreasing"],
        required: true,
      },
      pace: {
        type: String,
        enum: ["improving", "stable", "declining"],
      },
      heartRate: {
        type: String,
        enum: ["improving", "stable", "declining"],
      },
    },
    heartRateCoverage: { type: Number, required: true },
  },
  { _id: false },
);

const snapshotProfileSchema = new Schema<IAthleteSnapshotProfile>(
  {
    ageYears: { type: Number },
    weightKg: { type: Number },
    heightCm: { type: Number },
    firstActivityAt: { type: Date },
    lifetimeRunCount: { type: Number, required: true },
  },
  { _id: false },
);

const snapshotGoalSchema = new Schema<IAthleteSnapshotGoal>(
  {
    type: { type: String, enum: GOAL_TYPES, required: true },
    distanceKm: { type: Number, required: true },
    targetTimeSeconds: { type: Number, required: true },
    targetDate: { type: Date, required: true },
    weeksUntilTarget: { type: Number, required: true },
  },
  { _id: false },
);

const trainingPresetSchema = new Schema(
  {
    id: { type: String, required: true },
    goalType: { type: String, enum: GOAL_TYPES, required: true },
    name: { type: String, required: true },
    summary: { type: String, required: true },
    philosophy: { type: String, required: true },
    weekTemplate: {
      monday: { type: String, required: true },
      tuesday: { type: String, required: true },
      wednesday: { type: String, required: true },
      thursday: { type: String, required: true },
      friday: { type: String, required: true },
      saturday: { type: String, required: true },
      sunday: { type: String, required: true },
    },
    rules: { type: [String], required: true },
  },
  { _id: false },
);

const AthleteSnapshotSchema = new Schema<IAthleteSnapshot>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    schemaVersion: {
      type: Number,
      required: true,
      default: ATHLETE_SNAPSHOT_SCHEMA_VERSION,
    },
    generatedAt: { type: Date, required: true },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    profile: { type: snapshotProfileSchema, required: true },
    goal: { type: snapshotGoalSchema },
    trainingStyle: {
      type: String,
      enum: TRAINING_STYLES,
      required: true,
      default: "adaptive",
    },
    trainingPreset: { type: trainingPresetSchema },
    recentTraining: {
      weeks: { type: [weeklyTrainingSchema], required: true },
      recentActivities: { type: [snapshotActivitySchema], required: true },
      longestRun: { type: snapshotActivitySchema },
      bestEfforts: { type: estimatedEffortSetSchema, required: true },
    },
    historicalPerformance: {
      personalBests: { type: personalBestSetSchema, required: true },
      longestRun: { type: snapshotActivitySchema },
      lifetimeDistanceKm: { type: Number, required: true },
      lifetimeRuns: { type: Number, required: true },
    },
    currentState: { type: currentStateSchema, required: true },
    promptText: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "athlete_snapshots",
  },
);

AthleteSnapshotSchema.index({ userId: 1, createdAt: -1 });

export const AthleteSnapshot: Model<IAthleteSnapshot> =
  mongoose.models.AthleteSnapshot ??
  mongoose.model<IAthleteSnapshot>("AthleteSnapshot", AthleteSnapshotSchema);
