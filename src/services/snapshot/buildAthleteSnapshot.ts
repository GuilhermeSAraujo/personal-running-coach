import {
  ATHLETE_SNAPSHOT_SCHEMA_VERSION,
  type IAthleteSnapshot,
  type ISnapshotActivity,
} from "@/models";
import { GOAL_DISTANCE_KM } from "@/lib/goal";
import { buildCurrentState } from "./currentState";
import { estimateEfforts } from "./efforts";
import type { SnapshotActivityInput, SnapshotUser } from "./types";
import { bucketCompletedWeeks } from "./weeks";

export type { SnapshotActivityInput, SnapshotUser } from "./types";

const RECENT_ACTIVITY_LIMIT = 10;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function ageYearsAt(birthDate: Date, now: Date): number {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const month = now.getUTCMonth() - birthDate.getUTCMonth();
  if (
    month < 0 ||
    (month === 0 && now.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

function toSnapshotActivity(activity: SnapshotActivityInput): ISnapshotActivity {
  const result: ISnapshotActivity = {
    date: activity.startedAt,
    distanceKm: activity.distanceKm,
    durationSeconds: activity.durationSeconds,
    paceSecondsPerKm: activity.paceSecondsPerKm,
    elevationGainMeters: activity.elevationGainMeters,
  };
  if (activity.heartRate?.average != null) {
    result.averageHeartRate = activity.heartRate.average;
  }
  if (activity.heartRate?.max != null) {
    result.maxHeartRate = activity.heartRate.max;
  }
  if (activity.sufferScore != null) {
    result.sufferScore = activity.sufferScore;
  }
  return result;
}

function longestRun(
  activities: SnapshotActivityInput[],
): ISnapshotActivity | undefined {
  let best: SnapshotActivityInput | undefined;
  for (const activity of activities) {
    if (activity.type !== "run") continue;
    if (!best || activity.distanceKm > best.distanceKm) {
      best = activity;
    }
  }
  return best ? toSnapshotActivity(best) : undefined;
}

function runsInRange(
  activities: SnapshotActivityInput[],
  start: Date,
  end: Date,
): SnapshotActivityInput[] {
  return activities.filter((a) => {
    if (a.type !== "run") return false;
    const t = a.startedAt.getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
}

export function buildAthleteSnapshot(input: {
  user: SnapshotUser;
  activities: SnapshotActivityInput[];
  now: Date;
}): Omit<IAthleteSnapshot, "userId" | "createdAt"> {
  const { user, activities, now } = input;
  const { weeks, windowStart, windowEnd } = bucketCompletedWeeks(
    activities,
    now,
  );

  const runs = activities.filter((a) => a.type === "run");
  const firstActivityAt =
    activities.length > 0
      ? activities.reduce(
          (min, a) => (a.startedAt < min ? a.startedAt : min),
          activities[0].startedAt,
        )
      : undefined;

  const profile: Omit<IAthleteSnapshot, "userId" | "createdAt">["profile"] = {
    lifetimeRunCount: runs.length,
  };
  if (user.birthDate) {
    profile.ageYears = ageYearsAt(user.birthDate, now);
  }
  if (user.weightKg != null) profile.weightKg = user.weightKg;
  if (user.heightCm != null) profile.heightCm = user.heightCm;
  if (firstActivityAt) profile.firstActivityAt = firstActivityAt;

  const windowRuns = runsInRange(activities, windowStart, now);
  const recentActivities = [...windowRuns]
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map(toSnapshotActivity);

  const bestEfforts = estimateEfforts(windowRuns, [1, 3, 5, 10]);
  const personalBests = estimateEfforts(runs, [
    1,
    3,
    5,
    10,
    GOAL_DISTANCE_KM.half_marathon,
    GOAL_DISTANCE_KM.marathon,
  ]);

  const currentState = buildCurrentState({
    weeks,
    activities,
    windowStart,
    windowEnd,
    now,
    firstActivityAt,
  });

  const snapshot: Omit<IAthleteSnapshot, "userId" | "createdAt"> = {
    schemaVersion: ATHLETE_SNAPSHOT_SCHEMA_VERSION,
    generatedAt: now,
    windowStart,
    windowEnd,
    profile,
    recentTraining: {
      weeks,
      recentActivities,
      bestEfforts,
    },
    historicalPerformance: {
      personalBests,
      lifetimeDistanceKm: runs.reduce((s, a) => s + a.distanceKm, 0),
      lifetimeRuns: runs.length,
    },
    currentState,
  };

  const windowLongest = longestRun(windowRuns);
  if (windowLongest) {
    snapshot.recentTraining.longestRun = windowLongest;
  }

  const lifetimeLongest = longestRun(runs);
  if (lifetimeLongest) {
    snapshot.historicalPerformance.longestRun = lifetimeLongest;
  }

  if (user.goal) {
    const weeksUntilTarget = Math.floor(
      (user.goal.targetDate.getTime() - now.getTime()) / MS_PER_WEEK,
    );
    snapshot.goal = {
      type: user.goal.type,
      distanceKm: user.goal.distanceKm,
      targetTimeSeconds: user.goal.targetTimeSeconds,
      targetDate: user.goal.targetDate,
      weeksUntilTarget,
    };
  }

  return snapshot;
}
