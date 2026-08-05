import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import {
  WORKOUT_STATUSES,
  WORKOUT_TYPES,
  type WorkoutStatus,
  type WorkoutType,
} from "./shared";

export interface IWorkoutTarget {
  distanceKm?: number;
  durationMinutes?: number;
  paceMinPerKm?: number;
  paceMaxPerKm?: number;
  heartRateZone?: string;
}

export interface IWorkout {
  userId: Types.ObjectId;
  trainingPlanId: Types.ObjectId;
  scheduledDate: Date;
  type: WorkoutType;
  target: IWorkoutTarget;
  description: string;
  status: WorkoutStatus;
  activityId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkoutDocument = HydratedDocument<IWorkout>;

const workoutTargetSchema = new Schema<IWorkoutTarget>(
  {
    distanceKm: { type: Number },
    durationMinutes: { type: Number },
    paceMinPerKm: { type: Number },
    paceMaxPerKm: { type: Number },
    heartRateZone: { type: String },
  },
  { _id: false },
);

const WorkoutSchema = new Schema<IWorkout>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    trainingPlanId: {
      type: Schema.Types.ObjectId,
      ref: "TrainingPlan",
      required: true,
    },
    scheduledDate: { type: Date, required: true },
    type: { type: String, enum: WORKOUT_TYPES, required: true },
    target: { type: workoutTargetSchema, required: true, default: () => ({}) },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: WORKOUT_STATUSES,
      required: true,
      default: "scheduled",
    },
    activityId: { type: Schema.Types.ObjectId, ref: "Activity" },
  },
  {
    timestamps: true,
    collection: "workouts",
  },
);

WorkoutSchema.index({ userId: 1, scheduledDate: 1 });

export const Workout: Model<IWorkout> =
  mongoose.models.Workout ??
  mongoose.model<IWorkout>("Workout", WorkoutSchema);
