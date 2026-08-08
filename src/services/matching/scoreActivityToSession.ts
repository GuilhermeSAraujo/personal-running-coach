import type { SessionType } from "@/models/shared";
import type { ISessionSegment } from "@/models/SessionPlan";
import type {
  ActivityForMatch,
  ScoreResult,
  SessionForMatch,
} from "./types";

const ORDER_WEIGHT = 0.45;
const DISTANCE_WEIGHT = 0.3;
const DURATION_WEIGHT = 0.15;
const INTENSITY_WEIGHT = 0.1;

function plannedDistanceRange(session: SessionForMatch): {
  min?: number;
  max?: number;
} {
  if (
    session.totalDistanceKmMin != null ||
    session.totalDistanceKmMax != null
  ) {
    return {
      min: session.totalDistanceKmMin,
      max: session.totalDistanceKmMax,
    };
  }

  let sum = 0;
  let hasDistance = false;
  for (const segment of session.segments) {
    const repeat = segment.repeat ?? 1;
    const km =
      segment.distanceKm ??
      averageNullable(segment.distanceKmMin, segment.distanceKmMax);
    if (km != null) {
      sum += km * repeat;
      hasDistance = true;
    }
  }
  if (!hasDistance) return {};
  return { min: sum * 0.9, max: sum * 1.1 };
}

function averageNullable(a?: number, b?: number): number | undefined {
  if (a != null && b != null) return (a + b) / 2;
  return a ?? b;
}

function plannedDurationSeconds(segments: ISessionSegment[]): number | undefined {
  let totalMinutes = 0;
  let hasDuration = false;
  for (const segment of segments) {
    if (segment.durationMinutes == null) continue;
    const repeat = segment.repeat ?? 1;
    totalMinutes += segment.durationMinutes * repeat;
    hasDuration = true;
  }
  return hasDuration ? totalMinutes * 60 : undefined;
}

function distanceScore(
  activityKm: number,
  min?: number,
  max?: number,
): { score: number; reason?: string } {
  if (min == null && max == null) return { score: 0.5 };

  const low = min ?? max!;
  const high = max ?? min!;
  if (activityKm >= low && activityKm <= high) {
    return { score: 1, reason: "distance in range" };
  }

  const mid = (low + high) / 2;
  const span = Math.max(high - low, mid * 0.2, 0.5);
  const delta = activityKm < low ? low - activityKm : activityKm - high;
  const score = Math.max(0, 1 - delta / (span * 2));
  if (score >= 0.5) {
    return { score, reason: "distance near range" };
  }
  return { score };
}

function durationScore(
  activitySeconds: number,
  plannedSeconds?: number,
): { score: number; reason?: string } {
  if (plannedSeconds == null || plannedSeconds <= 0) {
    return { score: 0.5 };
  }
  const ratio =
    Math.min(activitySeconds, plannedSeconds) /
    Math.max(activitySeconds, plannedSeconds);
  if (ratio >= 0.85) {
    return { score: ratio, reason: "duration close to plan" };
  }
  return { score: ratio };
}

/** Pace seconds/km bands used as soft intensity priors. */
function intensityScore(
  type: SessionType,
  paceSecondsPerKm: number,
  heartRateAvg?: number,
): { score: number; reason?: string } {
  const paceMin = paceSecondsPerKm / 60;

  let expected: "easy" | "moderate" | "hard";
  if (type === "easy" || type === "recovery") expected = "easy";
  else if (type === "long_run") expected = "moderate";
  else expected = "hard";

  let observed: "easy" | "moderate" | "hard";
  if (heartRateAvg != null) {
    if (heartRateAvg < 145) observed = "easy";
    else if (heartRateAvg < 165) observed = "moderate";
    else observed = "hard";
  } else if (paceMin >= 6.5) {
    observed = "easy";
  } else if (paceMin >= 5.5) {
    observed = "moderate";
  } else {
    observed = "hard";
  }

  if (expected === observed) {
    return { score: 1, reason: "intensity fits session type" };
  }
  if (
    (expected === "easy" && observed === "moderate") ||
    (expected === "moderate" && observed !== "moderate") ||
    (expected === "hard" && observed === "moderate")
  ) {
    return { score: 0.55 };
  }
  return { score: 0.25 };
}

function orderScore(
  activityRank: number,
  sessionOrder: number,
): { score: number; reason?: string } {
  // session.order is 1-based; activityRank is 0-based by startedAt ascending
  const expectedRank = sessionOrder - 1;
  const delta = Math.abs(activityRank - expectedRank);
  if (delta === 0) {
    return { score: 1, reason: "fits session order" };
  }
  if (delta === 1) return { score: 0.55 };
  return { score: Math.max(0, 1 - delta * 0.35) };
}

export function scoreActivityToSession(
  activity: ActivityForMatch,
  session: SessionForMatch,
  activityRank: number,
): ScoreResult {
  const reasons: string[] = [];
  const order = orderScore(activityRank, session.order);
  if (order.reason) reasons.push(order.reason);

  const range = plannedDistanceRange(session);
  const distance = distanceScore(activity.distanceKm, range.min, range.max);
  if (distance.reason) reasons.push(distance.reason);

  const plannedDuration = plannedDurationSeconds(session.segments);
  const duration = durationScore(activity.durationSeconds, plannedDuration);
  if (duration.reason) reasons.push(duration.reason);

  const intensity = intensityScore(
    session.type,
    activity.paceSecondsPerKm,
    activity.heartRateAvg,
  );
  if (intensity.reason) reasons.push(intensity.reason);

  const score =
    order.score * ORDER_WEIGHT +
    distance.score * DISTANCE_WEIGHT +
    duration.score * DURATION_WEIGHT +
    intensity.score * INTENSITY_WEIGHT;

  return { score, reasons };
}
