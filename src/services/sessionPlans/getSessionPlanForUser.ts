import { dbConnect } from "@/lib/db";
import { SessionPlan } from "@/models";
import mongoose, { type Types } from "mongoose";
import { toSessionPlanSummary } from "./serialize";
import type { SessionPlanSummary } from "./types";

export type { SessionPlanSummary } from "./types";

export async function getSessionPlanForUser(
  planId: string,
  userId: Types.ObjectId | string,
): Promise<SessionPlanSummary | null> {
  if (!mongoose.isValidObjectId(planId)) {
    return null;
  }

  await dbConnect();

  const doc = await SessionPlan.findOne({
    _id: planId,
    userId,
  }).lean();

  if (!doc) return null;
  return toSessionPlanSummary(doc);
}
