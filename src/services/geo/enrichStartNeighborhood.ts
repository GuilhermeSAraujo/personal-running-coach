import type { Types } from "mongoose";
import { Activity } from "@/models";
import {
  readStoredStartNeighborhood,
  resolveStartNeighborhood,
} from "./startNeighborhood";

export async function loadExistingStartNeighborhoods(
  userId: Types.ObjectId,
  stravaActivityIds: number[],
): Promise<Map<number, string>> {
  const preserved = new Map<number, string>();
  if (stravaActivityIds.length === 0) {
    return preserved;
  }

  const docs = await Activity.find({
    userId,
    stravaActivityId: { $in: stravaActivityIds },
  })
    .select("stravaActivityId raw")
    .lean();

  for (const doc of docs) {
    const name = readStoredStartNeighborhood(doc.raw);
    if (name) {
      preserved.set(doc.stravaActivityId, name);
    }
  }

  return preserved;
}

export async function geocodeMissingStartNeighborhoods(
  userId: Types.ObjectId,
  stravaActivityIds: number[],
): Promise<void> {
  try {
    if (stravaActivityIds.length === 0) {
      return;
    }

    const docs = await Activity.find({
      userId,
      stravaActivityId: { $in: stravaActivityIds },
      "raw.start_neighborhood": { $exists: false },
    })
      .select("_id raw")
      .lean();

    for (const doc of docs) {
      try {
        const name = await resolveStartNeighborhood(doc.raw);
        if (!name) {
          continue;
        }
        await Activity.updateOne(
          { _id: doc._id },
          { $set: { "raw.start_neighborhood": name } },
        );
      } catch (error) {
        console.error("Failed to geocode start neighborhood:", error);
      }
    }
  } catch (error) {
    console.error("Failed to enrich start neighborhoods:", error);
  }
}
