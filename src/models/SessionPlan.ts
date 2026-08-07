import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import {
  SEGMENT_KINDS,
  SESSION_TYPES,
  type SegmentKind,
  type SessionType,
} from "./shared";

export const SESSION_PLAN_SCHEMA_VERSION = 1;

export interface ISessionSegment {
  kind: SegmentKind;
  repeat?: number;
  distanceKm?: number;
  distanceKmMin?: number;
  distanceKmMax?: number;
  durationMinutes?: number;
  paceMinPerKm?: number;
  paceMaxPerKm?: number;
  hrMin?: number;
  hrMax?: number;
  notes?: string;
}

export interface IPlannedSession {
  order: number;
  title: string;
  type: SessionType;
  purpose: string;
  totalDistanceKmMin?: number;
  totalDistanceKmMax?: number;
  coachingNotes: string[];
  segments: ISessionSegment[];
}

export interface ISessionPlan {
  userId: Types.ObjectId;
  athleteSnapshotId: Types.ObjectId;
  schemaVersion: number;
  generatedAt: Date;
  rationale?: string;
  sessions: IPlannedSession[];
  createdAt: Date;
}

export type SessionPlanDocument = HydratedDocument<ISessionPlan>;

const sessionSegmentSchema = new Schema<ISessionSegment>(
  {
    kind: { type: String, enum: SEGMENT_KINDS, required: true },
    repeat: { type: Number },
    distanceKm: { type: Number },
    distanceKmMin: { type: Number },
    distanceKmMax: { type: Number },
    durationMinutes: { type: Number },
    paceMinPerKm: { type: Number },
    paceMaxPerKm: { type: Number },
    hrMin: { type: Number },
    hrMax: { type: Number },
    notes: { type: String },
  },
  { _id: false },
);

const plannedSessionSchema = new Schema<IPlannedSession>(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true },
    type: { type: String, enum: SESSION_TYPES, required: true },
    purpose: { type: String, required: true },
    totalDistanceKmMin: { type: Number },
    totalDistanceKmMax: { type: Number },
    coachingNotes: { type: [String], required: true, default: [] },
    segments: {
      type: [sessionSegmentSchema],
      required: true,
      default: [],
    },
  },
  { _id: false },
);

const SessionPlanSchema = new Schema<ISessionPlan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    athleteSnapshotId: {
      type: Schema.Types.ObjectId,
      ref: "AthleteSnapshot",
      required: true,
    },
    schemaVersion: {
      type: Number,
      required: true,
      default: SESSION_PLAN_SCHEMA_VERSION,
    },
    generatedAt: { type: Date, required: true },
    rationale: { type: String },
    sessions: {
      type: [plannedSessionSchema],
      required: true,
      validate: {
        validator(value: IPlannedSession[]) {
          return Array.isArray(value) && value.length === 3;
        },
        message: "sessions must contain exactly 3 items",
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "session_plans",
  },
);

SessionPlanSchema.index({ userId: 1, createdAt: -1 });
SessionPlanSchema.index({ athleteSnapshotId: 1 });

export const SessionPlan: Model<ISessionPlan> =
  mongoose.models.SessionPlan ??
  mongoose.model<ISessionPlan>("SessionPlan", SessionPlanSchema);
