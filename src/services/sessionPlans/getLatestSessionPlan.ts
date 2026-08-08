import { dbConnect } from "@/lib/db";
import { SessionPlan } from "@/models";
import type { Types } from "mongoose";
import { toSessionPlanSummary } from "./serialize";
import type { SessionPlanSummary } from "./types";

export type { SessionPlanSummary } from "./types";

export async function getLatestSessionPlan(
  userId: Types.ObjectId | string,
): Promise<SessionPlanSummary | null> {
  await dbConnect();

  const doc = await SessionPlan.findOne({
    userId,
    $or: [{ status: "open" }, { status: { $exists: false } }],
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!doc) return null;
  return toSessionPlanSummary(doc);
}
