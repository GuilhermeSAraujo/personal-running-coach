import { dbConnect } from "@/lib/db";
import { Activity } from "@/models";
import type { ActivityType } from "@/models/shared";
import type { Types } from "mongoose";

export type ActivitySummary = {
  id: string;
  type: ActivityType;
  startedAt: string;
  distanceKm: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
};

export type ActivityHighlights = {
  last: ActivitySummary | null;
  longest: ActivitySummary | null;
  fastest: ActivitySummary | null;
};

type LeanActivity = {
  _id: Types.ObjectId;
  type: ActivityType;
  startedAt: Date;
  distanceKm: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
};

const SUMMARY_SELECT =
  "type startedAt distanceKm durationSeconds paceSecondsPerKm" as const;

function toSummary(doc: LeanActivity | null): ActivitySummary | null {
  if (!doc) return null;
  return {
    id: String(doc._id),
    type: doc.type,
    startedAt: doc.startedAt.toISOString(),
    distanceKm: doc.distanceKm,
    durationSeconds: doc.durationSeconds,
    paceSecondsPerKm: doc.paceSecondsPerKm,
  };
}

export async function getActivityHighlights(
  userId: Types.ObjectId | string,
): Promise<ActivityHighlights> {
  await dbConnect();

  const filter = { userId };
  const [last, longest, fastest] = await Promise.all([
    Activity.findOne(filter)
      .sort({ startedAt: -1 })
      .select(SUMMARY_SELECT)
      .lean<LeanActivity | null>(),
    Activity.findOne(filter)
      .sort({ distanceKm: -1 })
      .select(SUMMARY_SELECT)
      .lean<LeanActivity | null>(),
    Activity.findOne({ ...filter, distanceKm: { $gte: 1 } })
      .sort({ paceSecondsPerKm: 1 })
      .select(SUMMARY_SELECT)
      .lean<LeanActivity | null>(),
  ]);

  return {
    last: toSummary(last),
    longest: toSummary(longest),
    fastest: toSummary(fastest),
  };
}
