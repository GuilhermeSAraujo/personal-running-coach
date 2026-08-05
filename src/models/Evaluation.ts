import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import {
  athleteMetricsSchema,
  type IAthleteMetrics,
} from "./shared";

export interface IEvaluationPeriod {
  activities: Types.ObjectId[];
  startedAt: Date;
  endedAt: Date;
}

export interface IGoalAssessment {
  estimatedGoalTime: number;
  targetTime: number;
  gapSeconds: number;
  readiness: string;
}

export interface IEvaluationAnalysis {
  strengths: string[];
  weaknesses: string[];
  progress: string[];
  concerns: string[];
}

export interface IEvaluation {
  userId: Types.ObjectId;
  period: IEvaluationPeriod;
  metrics: IAthleteMetrics;
  goalAssessment: IGoalAssessment;
  analysis: IEvaluationAnalysis;
  recommendations: string[];
  createdAt: Date;
}

export type EvaluationDocument = HydratedDocument<IEvaluation>;

const evaluationPeriodSchema = new Schema<IEvaluationPeriod>(
  {
    activities: [
      {
        type: Schema.Types.ObjectId,
        ref: "Activity",
        required: true,
      },
    ],
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
  },
  { _id: false },
);

const goalAssessmentSchema = new Schema<IGoalAssessment>(
  {
    estimatedGoalTime: { type: Number, required: true },
    targetTime: { type: Number, required: true },
    gapSeconds: { type: Number, required: true },
    readiness: { type: String, required: true },
  },
  { _id: false },
);

const evaluationAnalysisSchema = new Schema<IEvaluationAnalysis>(
  {
    strengths: { type: [String], required: true, default: [] },
    weaknesses: { type: [String], required: true, default: [] },
    progress: { type: [String], required: true, default: [] },
    concerns: { type: [String], required: true, default: [] },
  },
  { _id: false },
);

const EvaluationSchema = new Schema<IEvaluation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    period: { type: evaluationPeriodSchema, required: true },
    metrics: { type: athleteMetricsSchema, required: true },
    goalAssessment: { type: goalAssessmentSchema, required: true },
    analysis: { type: evaluationAnalysisSchema, required: true },
    recommendations: { type: [String], required: true, default: [] },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "evaluations",
  },
);

EvaluationSchema.index({ userId: 1, createdAt: -1 });

export const Evaluation: Model<IEvaluation> =
  mongoose.models.Evaluation ??
  mongoose.model<IEvaluation>("Evaluation", EvaluationSchema);
