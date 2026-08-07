import type {
  IEstimatedEffort,
  IEstimatedEffortSet,
  IPersonalBestSet,
} from "@/models";
import { GOAL_DISTANCE_KM } from "@/lib/goal";
import type { SnapshotActivityInput } from "./types";

const EFFORT_TOLERANCE = 1.15;

const NOMINAL_KEYS: Record<number, keyof IPersonalBestSet> = {
  1: "1k",
  3: "3k",
  5: "5k",
  10: "10k",
  [GOAL_DISTANCE_KM.half_marathon]: "halfMarathon",
  [GOAL_DISTANCE_KM.marathon]: "marathon",
};

function qualifies(distanceKm: number, nominal: number): boolean {
  return distanceKm >= nominal && distanceKm <= nominal * EFFORT_TOLERANCE;
}

function toEffort(
  activity: SnapshotActivityInput,
  nominal: number,
): IEstimatedEffort {
  const effort: IEstimatedEffort = {
    nominalDistanceKm: nominal,
    actualDistanceKm: activity.distanceKm,
    actualTimeSeconds: activity.durationSeconds,
    paceSecondsPerKm: activity.paceSecondsPerKm,
    estimatedTimeSeconds: activity.paceSecondsPerKm * nominal,
    date: activity.startedAt,
  };
  if (activity.heartRate?.average != null) {
    effort.averageHeartRate = activity.heartRate.average;
  }
  return effort;
}

/**
 * Estimate best efforts at the given nominal distances (km).
 * Only runs qualify. Missing keys mean no qualifying activity.
 */
export function estimateEfforts(
  activities: SnapshotActivityInput[],
  nominalDistancesKm: number[],
): IEstimatedEffortSet & IPersonalBestSet {
  const result: IEstimatedEffortSet & IPersonalBestSet = {};

  for (const nominal of nominalDistancesKm) {
    const key = NOMINAL_KEYS[nominal];
    if (!key) continue;

    let best: SnapshotActivityInput | undefined;
    for (const activity of activities) {
      if (activity.type !== "run") continue;
      if (!qualifies(activity.distanceKm, nominal)) continue;
      if (
        !best ||
        activity.paceSecondsPerKm < best.paceSecondsPerKm
      ) {
        best = activity;
      }
    }

    if (best) {
      result[key] = toEffort(best, nominal);
    }
  }

  return result;
}
