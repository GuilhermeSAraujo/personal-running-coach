import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import {
  TRAINING_PLAN_STATUSES,
  type TrainingPlanStatus,
} from "./shared";

export interface ITrainingPlan {
  userId: Types.ObjectId;
  evaluationId: Types.ObjectId;
  status: TrainingPlanStatus;
  startDate: Date;
  endDate: Date;
  objective: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TrainingPlanDocument = HydratedDocument<ITrainingPlan>;

const TrainingPlanSchema = new Schema<ITrainingPlan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    evaluationId: {
      type: Schema.Types.ObjectId,
      ref: "Evaluation",
      required: true,
    },
    status: {
      type: String,
      enum: TRAINING_PLAN_STATUSES,
      required: true,
      default: "active",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    objective: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "training_plans",
  },
);

export const TrainingPlan: Model<ITrainingPlan> =
  mongoose.models.TrainingPlan ??
  mongoose.model<ITrainingPlan>("TrainingPlan", TrainingPlanSchema);
