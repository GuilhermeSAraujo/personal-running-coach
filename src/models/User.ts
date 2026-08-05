import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import { GOAL_TYPES, type GoalType } from "./shared";

export interface IUserStrava {
  athleteId: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface IUserProfile {
  name: string;
  email: string;
  birthDate?: Date;
  heightCm?: number;
  weightKg?: number;
  current5kTime?: number;
  longestRunKm?: number;
}

export interface IUserGoal {
  type: GoalType;
  distanceKm: number;
  targetTimeSeconds: number;
  targetDate: Date;
}

export interface IUserCoaching {
  activitiesSinceLastEvaluation: number;
  evaluationActivityThreshold: number;
  currentEvaluationId?: Types.ObjectId;
  currentTrainingPlanId?: Types.ObjectId;
}

export interface IUser {
  strava: IUserStrava;
  profile: IUserProfile;
  goal?: IUserGoal;
  coaching: IUserCoaching;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userStravaSchema = new Schema<IUserStrava>(
  {
    athleteId: { type: Number, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false },
);

const userProfileSchema = new Schema<IUserProfile>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    birthDate: { type: Date },
    heightCm: { type: Number },
    weightKg: { type: Number },
    current5kTime: { type: Number },
    longestRunKm: { type: Number },
  },
  { _id: false },
);

const userGoalSchema = new Schema<IUserGoal>(
  {
    type: { type: String, enum: GOAL_TYPES, required: true },
    distanceKm: { type: Number, required: true },
    targetTimeSeconds: { type: Number, required: true },
    targetDate: { type: Date, required: true },
  },
  { _id: false },
);

const userCoachingSchema = new Schema<IUserCoaching>(
  {
    activitiesSinceLastEvaluation: { type: Number, required: true, default: 0 },
    evaluationActivityThreshold: { type: Number, required: true, default: 3 },
    currentEvaluationId: { type: Schema.Types.ObjectId, ref: "Evaluation" },
    currentTrainingPlanId: { type: Schema.Types.ObjectId, ref: "TrainingPlan" },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    strava: { type: userStravaSchema, required: true },
    profile: { type: userProfileSchema, required: true },
    goal: { type: userGoalSchema },
    coaching: {
      type: userCoachingSchema,
      required: true,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: "users",
  },
);

UserSchema.index({ "strava.athleteId": 1 }, { unique: true });

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
