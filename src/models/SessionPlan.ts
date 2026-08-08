import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import {
  SEGMENT_KINDS,
  SESSION_TYPES,
  type SegmentKind,
  type SessionType,
} from "./shared";

export const SESSION_PLAN_SCHEMA_VERSION = 1;

export const SESSION_PLAN_STATUSES = ["open", "superseded"] as const;
export type SessionPlanStatus = (typeof SESSION_PLAN_STATUSES)[number];

export const PLANNED_SESSION_STATUSES = ["open", "matched", "skipped"] as const;
export type PlannedSessionStatus = (typeof PLANNED_SESSION_STATUSES)[number];

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
  scheduledDate: string;
  title: string;
  type: SessionType;
  purpose: string;
  totalDistanceKmMin?: number;
  totalDistanceKmMax?: number;
  coachingNotes: string[];
  segments: ISessionSegment[];
  status: PlannedSessionStatus;
  activityId?: Types.ObjectId;
  matchedAt?: Date;
}

export interface ISessionPlan {
  userId: Types.ObjectId;
  athleteSnapshotId: Types.ObjectId;
  schemaVersion: number;
  status: SessionPlanStatus;
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
    scheduledDate: { type: String, required: true },
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
    status: {
      type: String,
      enum: PLANNED_SESSION_STATUSES,
      required: true,
      default: "open",
    },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
    },
    matchedAt: { type: Date },
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
    status: {
      type: String,
      enum: SESSION_PLAN_STATUSES,
      required: true,
      default: "open",
    },
    generatedAt: { type: Date, required: true },
    rationale: { type: String },
    sessions: {
      type: [plannedSessionSchema],
      required: true,
      validate: {
        validator(value: IPlannedSession[]) {
          return Array.isArray(value) && value.length === 7;
        },
        message: "sessions must contain exactly 7 items",
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "session_plans",
  },
);

SessionPlanSchema.index({ userId: 1, createdAt: -1 });
SessionPlanSchema.index({ userId: 1, status: 1, createdAt: -1 });
SessionPlanSchema.index({ athleteSnapshotId: 1 });

export const SessionPlan: Model<ISessionPlan> =
  mongoose.models.SessionPlan ??
  mongoose.model<ISessionPlan>("SessionPlan", SessionPlanSchema);
