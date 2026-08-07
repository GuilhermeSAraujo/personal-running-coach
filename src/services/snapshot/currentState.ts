import type { ICurrentState, IWeeklyTraining } from "@/models";
import type { SnapshotActivityInput } from "./types";
import { currentWeekDistanceKm } from "./weeks";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function buildCurrentState(input: {
  weeks: IWeeklyTraining[];
  activities: SnapshotActivityInput[];
  windowStart: Date;
  windowEnd: Date;
  now: Date;
  firstActivityAt?: Date;
}): ICurrentState {
  const { weeks, activities, windowStart, windowEnd, now, firstActivityAt } =
    input;

  const prior = weeks.slice(0, 8);
  const recent = weeks.slice(8, 12);

  const average12w =
    weeks.reduce((sum, w) => sum + w.distanceKm, 0) / weeks.length;
  const average4w =
    recent.reduce((sum, w) => sum + w.distanceKm, 0) / recent.length;
  const priorAvg =
    prior.reduce((sum, w) => sum + w.distanceKm, 0) / prior.length;

  const averageRunsPerWeek12w =
    weeks.reduce((sum, w) => sum + w.runs, 0) / weeks.length;
  const averageRunsPerWeek4w =
    recent.reduce((sum, w) => sum + w.runs, 0) / recent.length;

  const currentWeek = currentWeekDistanceKm(activities, windowEnd, now);

  const weeksWithAtLeast3Runs = weeks.filter((w) => w.runs >= 3).length;
  let totalWeeks = 0;
  if (firstActivityAt) {
    const firstMs = firstActivityAt.getTime();
    totalWeeks = weeks.filter((w) => w.weekStart.getTime() >= firstMs).length;
  }

  const activeLongRuns = weeks
    .filter((w) => w.runs > 0)
    .map((w) => w.longestRunKm);
  const averageKm12w =
    activeLongRuns.length > 0
      ? activeLongRuns.reduce((a, b) => a + b, 0) / activeLongRuns.length
      : 0;

  const twentyEightDaysAgo = new Date(now.getTime() - 28 * MS_PER_DAY);
  let currentLongestKm = 0;
  for (const activity of activities) {
    if (activity.type !== "run") continue;
    const t = activity.startedAt.getTime();
    if (t < twentyEightDaysAgo.getTime() || t > now.getTime()) continue;
    if (activity.distanceKm > currentLongestKm) {
      currentLongestKm = activity.distanceKm;
    }
  }

  // HR coverage over windowStart..generatedAt (includes current week)
  let runsInRange = 0;
  let runsWithHr = 0;
  for (const activity of activities) {
    if (activity.type !== "run") continue;
    const t = activity.startedAt.getTime();
    if (t < windowStart.getTime() || t > now.getTime()) continue;
    runsInRange += 1;
    if (activity.heartRate?.average != null) runsWithHr += 1;
  }
  const heartRateCoverage = runsInRange > 0 ? runsWithHr / runsInRange : 0;

  const trends: ICurrentState["trends"] = {
    volume: volumeTrend(average4w, priorAvg),
  };

  const paceTrend = computePaceTrend(prior, recent);
  if (paceTrend) trends.pace = paceTrend;

  const hrTrend = computeHeartRateTrend(activities, windowStart, windowEnd);
  if (hrTrend) trends.heartRate = hrTrend;

  return {
    weeklyVolumeKm: { average12w, average4w, currentWeek },
    frequency: { averageRunsPerWeek12w, averageRunsPerWeek4w },
    longRun: { currentLongestKm, averageKm12w },
    consistency: { weeksWithAtLeast3Runs, totalWeeks },
    trends,
    heartRateCoverage,
  };
}

function volumeTrend(
  recentAvg: number,
  priorAvg: number,
): "increasing" | "stable" | "decreasing" {
  if (priorAvg === 0 && recentAvg > 0) return "increasing";
  if (priorAvg === 0 && recentAvg === 0) return "stable";
  const ratio = recentAvg / priorAvg;
  if (ratio > 1.1) return "increasing";
  if (ratio < 0.9) return "decreasing";
  return "stable";
}

function distanceWeightedPace(weeks: IWeeklyTraining[]): number | undefined {
  let distance = 0;
  let duration = 0;
  for (const w of weeks) {
    distance += w.distanceKm;
    duration += w.durationSeconds;
  }
  if (distance === 0) return undefined;
  return duration / distance;
}

function computePaceTrend(
  prior: IWeeklyTraining[],
  recent: IWeeklyTraining[],
): "improving" | "stable" | "declining" | undefined {
  const priorRuns = prior.reduce((s, w) => s + w.runs, 0);
  const recentRuns = recent.reduce((s, w) => s + w.runs, 0);
  if (priorRuns < 3 || recentRuns < 3) return undefined;

  const priorPace = distanceWeightedPace(prior);
  const recentPace = distanceWeightedPace(recent);
  if (priorPace == null || recentPace == null) return undefined;

  const ratio = recentPace / priorPace;
  if (ratio < 0.98) return "improving";
  if (ratio > 1.02) return "declining";
  return "stable";
}

function periodBeatsPerKm(
  activities: SnapshotActivityInput[],
  start: Date,
  end: Date,
): { beatsPerKm: number; runCount: number; hrRunCount: number } | undefined {
  let distance = 0;
  let duration = 0;
  let hrWeighted = 0;
  let hrDuration = 0;
  let runCount = 0;
  let hrRunCount = 0;

  for (const activity of activities) {
    if (activity.type !== "run") continue;
    const t = activity.startedAt.getTime();
    if (t < start.getTime() || t >= end.getTime()) continue;
    runCount += 1;
    distance += activity.distanceKm;
    duration += activity.durationSeconds;
    if (activity.heartRate?.average != null) {
      hrRunCount += 1;
      hrWeighted += activity.heartRate.average * activity.durationSeconds;
      hrDuration += activity.durationSeconds;
    }
  }

  if (hrDuration === 0 || distance === 0) return undefined;
  const avgHr = hrWeighted / hrDuration;
  const pace = duration / distance;
  return {
    beatsPerKm: (avgHr * pace) / 60,
    runCount,
    hrRunCount,
  };
}

function computeHeartRateTrend(
  activities: SnapshotActivityInput[],
  windowStart: Date,
  windowEnd: Date,
): "improving" | "stable" | "declining" | undefined {
  // Prior 8 weeks: windowStart .. windowStart+8w
  // Recent 4 weeks: windowStart+8w .. windowEnd
  const mid = new Date(windowStart.getTime() + 8 * 7 * MS_PER_DAY);
  const prior = periodBeatsPerKm(activities, windowStart, mid);
  const recent = periodBeatsPerKm(activities, mid, windowEnd);
  if (!prior || !recent) return undefined;
  if (prior.hrRunCount < 3 || recent.hrRunCount < 3) return undefined;

  const priorCoverage = prior.hrRunCount / prior.runCount;
  const recentCoverage = recent.hrRunCount / recent.runCount;
  if (priorCoverage < 0.5 || recentCoverage < 0.5) return undefined;

  const ratio = recent.beatsPerKm / prior.beatsPerKm;
  if (ratio < 0.97) return "improving";
  if (ratio > 1.03) return "declining";
  return "stable";
}
