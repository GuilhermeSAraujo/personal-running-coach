import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

export const DAILY_COACH_MESSAGE_SCHEMA_VERSION = 1;

export interface IDailyCoachMessage {
  userId: Types.ObjectId;
  date: string;
  message: string;
  promptText: string;
  schemaVersion: number;
  generatedAt: Date;
  createdAt: Date;
}

export type DailyCoachMessageDocument = HydratedDocument<IDailyCoachMessage>;

const DailyCoachMessageSchema = new Schema<IDailyCoachMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    promptText: {
      type: String,
      required: true,
    },
    schemaVersion: {
      type: Number,
      required: true,
      default: DAILY_COACH_MESSAGE_SCHEMA_VERSION,
    },
    generatedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "daily_coach_messages",
  },
);

DailyCoachMessageSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyCoachMessage: Model<IDailyCoachMessage> =
  mongoose.models.DailyCoachMessage ??
  mongoose.model<IDailyCoachMessage>(
    "DailyCoachMessage",
    DailyCoachMessageSchema,
  );
