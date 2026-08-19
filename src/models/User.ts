import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import {
  TRAINING_STYLES,
  type TrainingStyle,
} from "@/lib/trainingStyle";
import { GOAL_TYPES, type GoalType } from "./shared";

export { TRAINING_STYLES, type TrainingStyle };

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

export interface IUser {
  strava: IUserStrava;
  profile: IUserProfile;
  goal?: IUserGoal;
  /** Missing on legacy users — treat as adaptive at snapshot time. */
  trainingStyle?: TrainingStyle;
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

const UserSchema = new Schema<IUser>(
  {
    strava: { type: userStravaSchema, required: true },
    profile: { type: userProfileSchema, required: true },
    goal: { type: userGoalSchema },
    trainingStyle: { type: String, enum: TRAINING_STYLES },
  },
  {
    timestamps: true,
    collection: "users",
  },
);

UserSchema.index({ "strava.athleteId": 1 }, { unique: true });

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
