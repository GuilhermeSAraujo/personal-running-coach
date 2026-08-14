import { dbConnect } from "@/lib/db";
import { Activity, AthleteSnapshot, type IAthleteSnapshot } from "@/models";
import type { Types } from "mongoose";
import { bucketWeek, startOfWeekMondayUtc } from "@/services/snapshot/weeks";
import type { SnapshotActivityInput } from "@/services/snapshot/types";
import type { MetricsDashboard, MetricsWeekPoint } from "./types";

export type MetricsWeekInput = {
  weekStart: Date;
  distanceKm: number;
  runs: number;
  longestRunKm: number;
  averagePaceSecondsPerKm?: number | null;
};

export type MetricsSnapshotInput = {
  generatedAt: Date;
  recentTraining: {
    weeks: MetricsWeekInput[];
  };
  currentState: Pick<
    IAthleteSnapshot["currentState"],
    "weeklyVolumeKm" | "frequency" | "longRun" | "trends"
  >;
  goal?: {
    distanceKm: number;
  };
};

function weekLabel(weekStart: Date): string {
  const month = weekStart.getUTCMonth() + 1;
  const day = weekStart.getUTCDate();
  return `${month}/${day}`;
}

function toWeekPoint(week: MetricsWeekInput, isPreview: boolean): MetricsWeekPoint {
  return {
    weekStart: week.weekStart.toISOString(),
    label: weekLabel(week.weekStart),
    distanceKm: week.distanceKm,
    runs: week.runs,
    longestRunKm: week.longestRunKm,
    averagePaceSecondsPerKm:
      week.averagePaceSecondsPerKm == null
        ? null
        : week.averagePaceSecondsPerKm,
    isPreview,
  };
}

export function mapAthleteSnapshotToMetricsDashboard(
  snapshot: MetricsSnapshotInput | null,
  currentWeekPreview?: MetricsWeekInput | null,
): MetricsDashboard {
  if (!snapshot) return { empty: true };

  const weeks: MetricsWeekPoint[] = snapshot.recentTraining.weeks.map((week) =>
    toWeekPoint(week, false),
  );
  if (currentWeekPreview) {
    weeks.push(toWeekPoint(currentWeekPreview, true));
  }

  return {
    empty: false,
    generatedAt: snapshot.generatedAt.toISOString(),
    kpis: {
      currentWeekVolumeKm: currentWeekPreview
        ? currentWeekPreview.distanceKm
        : snapshot.currentState.weeklyVolumeKm.currentWeek,
      averageRunsPerWeek4w: snapshot.currentState.frequency.averageRunsPerWeek4w,
      currentLongestKm: snapshot.currentState.longRun.currentLongestKm,
      paceTrend: snapshot.currentState.trends.pace ?? null,
    },
    weeks,
    longRunGoalKm: snapshot.goal?.distanceKm ?? null,
  };
}

const CURRENT_WEEK_ACTIVITY_SELECT =
  "type startedAt distanceKm durationSeconds paceSecondsPerKm elevationGainMeters heartRate sufferScore athleteFeedback" as const;

export async function getMetricsDashboard(
  userId: Types.ObjectId | string,
  now: Date = new Date(),
): Promise<MetricsDashboard> {
  await dbConnect();
  const snapshot = await AthleteSnapshot.findOne({ userId })
    .sort({ createdAt: -1 })
    .select("generatedAt recentTraining currentState goal")
    .lean<MetricsSnapshotInput | null>();
  if (!snapshot) return mapAthleteSnapshotToMetricsDashboard(null);

  const weekStart = startOfWeekMondayUtc(now);
  const activities = await Activity.find({
    userId,
    startedAt: { $gte: weekStart, $lte: now },
  })
    .select(CURRENT_WEEK_ACTIVITY_SELECT)
    .lean<SnapshotActivityInput[]>();
  const preview = bucketWeek(activities, weekStart, now);
  return mapAthleteSnapshotToMetricsDashboard(snapshot, preview);
}
