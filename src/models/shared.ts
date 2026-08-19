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

export const SESSION_TYPES = [
  "easy",
  "tempo",
  "long_run",
  "interval",
  "recovery",
  "rest",
] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SEGMENT_KINDS = [
  "warmup",
  "work",
  "rest",
  "cooldown",
  "steady",
] as const;
export type SegmentKind = (typeof SEGMENT_KINDS)[number];

export interface IHeartRate {
  average?: number;
  max?: number;
}

export const heartRateSchema = new Schema<IHeartRate>(
  {
    average: { type: Number },
    max: { type: Number },
  },
  { _id: false },
);
