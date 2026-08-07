import type { IWeeklyTraining } from "@/models";
import type { SnapshotActivityInput } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const COMPLETED_WEEKS = 12;

export function startOfWeekMondayUtc(date: Date): Date {
  const d = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const daysSinceMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d;
}

function emptyWeek(weekStart: Date): IWeeklyTraining {
  return {
    weekStart,
    runs: 0,
    distanceKm: 0,
    durationSeconds: 0,
    longestRunKm: 0,
    activitiesWithHeartRate: 0,
    elevationGainMeters: 0,
    walkCount: 0,
    walkDistanceKm: 0,
  };
}

function finalizeWeek(week: IWeeklyTraining): IWeeklyTraining {
  const result: IWeeklyTraining = { ...week };
  if (result.distanceKm > 0) {
    result.averagePaceSecondsPerKm =
      result.durationSeconds / result.distanceKm;
  }
  return result;
}

export function bucketCompletedWeeks(
  activities: SnapshotActivityInput[],
  now: Date,
): {
  weeks: IWeeklyTraining[];
  windowStart: Date;
  windowEnd: Date;
} {
  const windowEnd = startOfWeekMondayUtc(now);
  const windowStart = new Date(
    windowEnd.getTime() - COMPLETED_WEEKS * 7 * MS_PER_DAY,
  );

  const weeks: IWeeklyTraining[] = [];
  for (let i = 0; i < COMPLETED_WEEKS; i++) {
    weeks.push(
      emptyWeek(new Date(windowStart.getTime() + i * 7 * MS_PER_DAY)),
    );
  }

  // Accumulator for duration-weighted HR and suffer score per week index
  const hrDurationSum = new Array(COMPLETED_WEEKS).fill(0);
  const hrWeightedSum = new Array(COMPLETED_WEEKS).fill(0);
  const sufferSum = new Array(COMPLETED_WEEKS).fill(0);
  const sufferCount = new Array(COMPLETED_WEEKS).fill(0);

  for (const activity of activities) {
    const t = activity.startedAt.getTime();
    if (t < windowStart.getTime() || t >= windowEnd.getTime()) {
      continue;
    }
    const index = Math.floor(
      (t - windowStart.getTime()) / (7 * MS_PER_DAY),
    );
    if (index < 0 || index >= COMPLETED_WEEKS) continue;

    const week = weeks[index];
    if (activity.type === "walk") {
      week.walkCount += 1;
      week.walkDistanceKm += activity.distanceKm;
      continue;
    }

    week.runs += 1;
    week.distanceKm += activity.distanceKm;
    week.durationSeconds += activity.durationSeconds;
    week.elevationGainMeters += activity.elevationGainMeters;
    if (activity.distanceKm > week.longestRunKm) {
      week.longestRunKm = activity.distanceKm;
    }

    const avgHr = activity.heartRate?.average;
    if (avgHr != null) {
      week.activitiesWithHeartRate += 1;
      hrDurationSum[index] += activity.durationSeconds;
      hrWeightedSum[index] += avgHr * activity.durationSeconds;
    }

    if (activity.sufferScore != null) {
      sufferSum[index] += activity.sufferScore;
      sufferCount[index] += 1;
    }
  }

  for (let i = 0; i < COMPLETED_WEEKS; i++) {
    if (hrDurationSum[i] > 0) {
      weeks[i].averageHeartRate = hrWeightedSum[i] / hrDurationSum[i];
    }
    if (sufferCount[i] > 0) {
      weeks[i].totalSufferScore = sufferSum[i];
    }
    weeks[i] = finalizeWeek(weeks[i]);
  }

  return { weeks, windowStart, windowEnd };
}

export function currentWeekDistanceKm(
  activities: SnapshotActivityInput[],
  windowEnd: Date,
  now: Date,
): number {
  let total = 0;
  const end = now.getTime();
  const start = windowEnd.getTime();
  for (const activity of activities) {
    if (activity.type !== "run") continue;
    const t = activity.startedAt.getTime();
    if (t >= start && t <= end) {
      total += activity.distanceKm;
    }
  }
  return total;
}
