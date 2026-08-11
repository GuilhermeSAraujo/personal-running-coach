import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import {
  ACTIVITY_SOURCES,
  ACTIVITY_TYPES,
  heartRateSchema,
  type ActivitySource,
  type ActivityType,
  type IHeartRate,
} from "./shared";

export const ATHLETE_EFFORTS = ["too_easy", "about_right", "too_hard"] as const;
export type AthleteEffort = (typeof ATHLETE_EFFORTS)[number];
export const ATHLETE_NOTES_MAX_LENGTH = 500;

export interface IAthleteFeedback {
  effort?: AthleteEffort;
  notes?: string;
}

export interface IActivityTraining {
  estimatedZone?: string;
  intensity?: string;
}

export interface IActivity {
  userId: Types.ObjectId;
  stravaActivityId: number;
  type: ActivityType;
  startedAt: Date;
  distanceKm: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
  elevationGainMeters: number;
  heartRate?: IHeartRate;
  cadence?: number;
  sufferScore?: number;
  splits?: unknown[];
  training?: IActivityTraining;
  athleteFeedback?: IAthleteFeedback;
  source: ActivitySource;
  raw?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export type ActivityDocument = HydratedDocument<IActivity>;

const activityTrainingSchema = new Schema<IActivityTraining>(
  {
    estimatedZone: { type: String },
    intensity: { type: String },
  },
  { _id: false },
);

const athleteFeedbackSchema = new Schema<IAthleteFeedback>(
  {
    effort: { type: String, enum: ATHLETE_EFFORTS },
    notes: { type: String },
  },
  { _id: false },
);

const ActivitySchema = new Schema<IActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stravaActivityId: { type: Number, required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    startedAt: { type: Date, required: true },
    distanceKm: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
    paceSecondsPerKm: { type: Number, required: true },
    elevationGainMeters: { type: Number, required: true },
    heartRate: { type: heartRateSchema },
    cadence: { type: Number },
    sufferScore: { type: Number },
    splits: { type: [Schema.Types.Mixed] },
    training: { type: activityTrainingSchema },
    athleteFeedback: { type: athleteFeedbackSchema },
    source: {
      type: String,
      enum: ACTIVITY_SOURCES,
      required: true,
      default: "strava",
    },
    raw: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: "activities",
  },
);

ActivitySchema.index({ userId: 1, startedAt: -1 });
ActivitySchema.index({ userId: 1, stravaActivityId: 1 }, { unique: true });

export const Activity: Model<IActivity> =
  mongoose.models.Activity ??
  mongoose.model<IActivity>("Activity", ActivitySchema);
