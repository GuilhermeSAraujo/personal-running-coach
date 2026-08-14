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

type WeekAccumulators = {
  hrDurationSum: number;
  hrWeightedSum: number;
  sufferSum: number;
  sufferCount: number;
};

function emptyAccumulators(): WeekAccumulators {
  return {
    hrDurationSum: 0,
    hrWeightedSum: 0,
    sufferSum: 0,
    sufferCount: 0,
  };
}

function applyActivityToWeek(
  week: IWeeklyTraining,
  activity: SnapshotActivityInput,
  acc: WeekAccumulators,
): void {
  if (activity.type === "walk") {
    week.walkCount += 1;
    week.walkDistanceKm += activity.distanceKm;
    return;
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
    acc.hrDurationSum += activity.durationSeconds;
    acc.hrWeightedSum += avgHr * activity.durationSeconds;
  }

  if (activity.sufferScore != null) {
    acc.sufferSum += activity.sufferScore;
    acc.sufferCount += 1;
  }
}

function finishWeek(
  week: IWeeklyTraining,
  acc: WeekAccumulators,
): IWeeklyTraining {
  if (acc.hrDurationSum > 0) {
    week.averageHeartRate = acc.hrWeightedSum / acc.hrDurationSum;
  }
  if (acc.sufferCount > 0) {
    week.totalSufferScore = acc.sufferSum;
  }
  return finalizeWeek(week);
}

export function bucketWeek(
  activities: SnapshotActivityInput[],
  weekStart: Date,
  rangeEndInclusive: Date,
): IWeeklyTraining {
  const week = emptyWeek(weekStart);
  const acc = emptyAccumulators();
  const start = weekStart.getTime();
  const end = rangeEndInclusive.getTime();
  const weekEndExclusive = start + 7 * MS_PER_DAY;

  for (const activity of activities) {
    const t = activity.startedAt.getTime();
    if (t < start || t > end || t >= weekEndExclusive) continue;
    applyActivityToWeek(week, activity, acc);
  }

  return finishWeek(week, acc);
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

  const accs = Array.from({ length: COMPLETED_WEEKS }, () => emptyAccumulators());

  for (const activity of activities) {
    const t = activity.startedAt.getTime();
    if (t < windowStart.getTime() || t >= windowEnd.getTime()) {
      continue;
    }
    const index = Math.floor(
      (t - windowStart.getTime()) / (7 * MS_PER_DAY),
    );
    if (index < 0 || index >= COMPLETED_WEEKS) continue;
    applyActivityToWeek(weeks[index], activity, accs[index]);
  }

  for (let i = 0; i < COMPLETED_WEEKS; i++) {
    weeks[i] = finishWeek(weeks[i], accs[i]);
  }

  return { weeks, windowStart, windowEnd };
}

export function currentWeekDistanceKm(
  activities: SnapshotActivityInput[],
  windowEnd: Date,
  now: Date,
): number {
  return bucketWeek(activities, windowEnd, now).distanceKm;
}
