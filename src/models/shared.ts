import { Schema } from "mongoose";
import {
  GOAL_DISTANCE_KM,
  GOAL_TYPES,
  type GoalType,
} from "@/lib/goal";

export {
  GOAL_DISTANCE_KM,
  GOAL_TYPES,
  type GoalType,
};

export const ACTIVITY_TYPES = ["run", "walk"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_SOURCES = ["strava"] as const;
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

export const WORKOUT_TYPES = [
  "easy",
  "long_run",
  "tempo",
  "interval",
  "recovery",
  "race",
] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const WORKOUT_STATUSES = [
  "scheduled",
  "completed",
  "missed",
  "skipped",
] as const;
export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number];

export const TRAINING_PLAN_STATUSES = [
  "active",
  "completed",
  "cancelled",
] as const;
export type TrainingPlanStatus = (typeof TRAINING_PLAN_STATUSES)[number];

export interface IEstimatedRaceTimes {
  "5k"?: number;
  "10k"?: number;
  halfMarathon?: number;
  marathon?: number;
}

export interface IAthleteMetrics {
  weeklyMileageKm: number;
  longestRunKm: number;
  consistency: number;
  easyVolumePercentage: number;
  estimatedRaceTimes: IEstimatedRaceTimes;
}

export interface IHeartRate {
  average?: number;
  max?: number;
}

export const estimatedRaceTimesSchema = new Schema<IEstimatedRaceTimes>(
  {
    "5k": { type: Number },
    "10k": { type: Number },
    halfMarathon: { type: Number },
    marathon: { type: Number },
  },
  { _id: false },
);

export const athleteMetricsSchema = new Schema<IAthleteMetrics>(
  {
    weeklyMileageKm: { type: Number, required: true },
    longestRunKm: { type: Number, required: true },
    consistency: { type: Number, required: true },
    easyVolumePercentage: { type: Number, required: true },
    estimatedRaceTimes: { type: estimatedRaceTimesSchema, required: true },
  },
  { _id: false },
);

export const heartRateSchema = new Schema<IHeartRate>(
  {
    average: { type: Number },
    max: { type: Number },
  },
  { _id: false },
);
