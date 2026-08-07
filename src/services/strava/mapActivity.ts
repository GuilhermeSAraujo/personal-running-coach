import type { Types } from "mongoose";
import type { IActivity, ActivityType } from "@/models";
import type { StravaSummaryActivity } from "./types";

function sportKind(activity: StravaSummaryActivity): string | undefined {
  return activity.sport_type ?? activity.type;
}

export function isRunOrWalk(activity: StravaSummaryActivity): boolean {
  const kind = sportKind(activity);
  return kind === "Run" || kind === "Walk";
}

function toActivityType(activity: StravaSummaryActivity): ActivityType {
  const kind = sportKind(activity);
  if (kind === "Walk") return "walk";
  return "run";
}

export function mapSummaryToActivity(
  userId: Types.ObjectId,
  activity: StravaSummaryActivity,
): Omit<IActivity, "createdAt" | "updatedAt"> {
  const distanceKm = activity.distance / 1000;
  const durationSeconds = activity.moving_time;
  const paceSecondsPerKm =
    distanceKm > 0 ? durationSeconds / distanceKm : 0;

  const heartRate =
    activity.average_heartrate != null || activity.max_heartrate != null
      ? {
          ...(activity.average_heartrate != null
            ? { average: activity.average_heartrate }
            : {}),
          ...(activity.max_heartrate != null
            ? { max: activity.max_heartrate }
            : {}),
        }
      : undefined;

  return {
    userId,
    stravaActivityId: activity.id,
    type: toActivityType(activity),
    startedAt: new Date(activity.start_date),
    distanceKm,
    durationSeconds,
    paceSecondsPerKm,
    elevationGainMeters: activity.total_elevation_gain ?? 0,
    ...(heartRate ? { heartRate } : {}),
    ...(activity.suffer_score != null ? { sufferScore: activity.suffer_score } : {}),
    source: "strava",
    raw: activity,
  };
}
