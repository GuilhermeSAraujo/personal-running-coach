import { Activity } from "@/models";

/**
 * Promote raw.suffer_score → top-level sufferScore for activities that
 * already have the value in raw but lack the normalized field.
 * Idempotent: second run matches zero docs once all are backfilled.
 */
export async function backfillSufferScoreFromRaw(): Promise<number> {
  const result = await Activity.updateMany(
    {
      sufferScore: { $exists: false },
      "raw.suffer_score": { $type: "number" },
    },
    [{ $set: { sufferScore: "$raw.suffer_score" } }],
    { updatePipeline: true },
  );

  return result.modifiedCount;
}
