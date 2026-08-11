import { dbConnect } from "@/lib/db";
import { AthleteSnapshot, type IAthleteSnapshot } from "@/models";
import type { Types } from "mongoose";
import type { MetricsDashboard, MetricsWeekPoint } from "./types";

export type MetricsSnapshotInput = {
  generatedAt: Date;
  recentTraining: {
    weeks: Array<{
      weekStart: Date;
      distanceKm: number;
      runs: number;
      longestRunKm: number;
      averagePaceSecondsPerKm?: number | null;
    }>;
  };
  currentState: Pick<
    IAthleteSnapshot["currentState"],
    "weeklyVolumeKm" | "frequency" | "longRun" | "trends"
  >;
};

function weekLabel(weekStart: Date): string {
  const month = weekStart.getUTCMonth() + 1;
  const day = weekStart.getUTCDate();
  return `${month}/${day}`;
}

export function mapAthleteSnapshotToMetricsDashboard(
  snapshot: MetricsSnapshotInput | null,
): MetricsDashboard {
  if (!snapshot) return { empty: true };

  const weeks: MetricsWeekPoint[] = snapshot.recentTraining.weeks.map((week) => ({
    weekStart: week.weekStart.toISOString(),
    label: weekLabel(week.weekStart),
    distanceKm: week.distanceKm,
    runs: week.runs,
    longestRunKm: week.longestRunKm,
    averagePaceSecondsPerKm:
      week.averagePaceSecondsPerKm == null
        ? null
        : week.averagePaceSecondsPerKm,
  }));

  return {
    empty: false,
    generatedAt: snapshot.generatedAt.toISOString(),
    kpis: {
      currentWeekVolumeKm: snapshot.currentState.weeklyVolumeKm.currentWeek,
      averageRunsPerWeek4w: snapshot.currentState.frequency.averageRunsPerWeek4w,
      currentLongestKm: snapshot.currentState.longRun.currentLongestKm,
      paceTrend: snapshot.currentState.trends.pace ?? null,
    },
    weeks,
  };
}

export async function getMetricsDashboard(
  userId: Types.ObjectId | string,
): Promise<MetricsDashboard> {
  await dbConnect();
  const snapshot = await AthleteSnapshot.findOne({ userId })
    .sort({ createdAt: -1 })
    .select("generatedAt recentTraining currentState")
    .lean<MetricsSnapshotInput | null>();
  return mapAthleteSnapshotToMetricsDashboard(snapshot);
}
