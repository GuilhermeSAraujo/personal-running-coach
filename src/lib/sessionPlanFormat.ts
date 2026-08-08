import { formatDistanceKm } from "@/lib/activityFormat";
import type { SegmentKind, SessionType } from "@/models/shared";
import type { SessionSegmentSummary } from "@/services/sessionPlans/types";

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  easy: "Easy",
  tempo: "Tempo",
  long_run: "Long run",
  interval: "Interval",
  recovery: "Recovery",
  rest: "Rest",
};

const SEGMENT_KIND_LABELS: Record<SegmentKind, string> = {
  warmup: "Warm-up",
  work: "Work",
  rest: "Rest",
  cooldown: "Cool-down",
  steady: "Steady",
};

export function formatSessionType(type: SessionType | string): string {
  if (type in SESSION_TYPE_LABELS) {
    return SESSION_TYPE_LABELS[type as SessionType];
  }
  return type;
}

export function formatDistanceRange(
  minKm?: number,
  maxKm?: number,
): string | null {
  if (minKm != null && maxKm != null) {
    if (minKm === maxKm) return formatDistanceKm(minKm);
    return `${minKm.toFixed(1)}–${maxKm.toFixed(1)} km`;
  }
  if (minKm != null) return `from ${formatDistanceKm(minKm)}`;
  if (maxKm != null) return `up to ${formatDistanceKm(maxKm)}`;
  return null;
}

/** Formats decimal minutes-per-km (e.g. 5.92) as `m:ss /km`. */
export function formatPaceMinPerKm(minutesPerKm: number): string {
  if (!Number.isFinite(minutesPerKm) || minutesPerKm < 0) return "—";
  const totalSeconds = Math.round(minutesPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
}

export function formatSegmentKind(kind: SegmentKind | string): string {
  if (kind in SEGMENT_KIND_LABELS) {
    return SEGMENT_KIND_LABELS[kind as SegmentKind];
  }
  return kind;
}

export function formatSegmentSummary(segment: SessionSegmentSummary): string {
  const parts: string[] = [formatSegmentKind(segment.kind)];

  if (segment.repeat != null && segment.repeat > 1) {
    parts.push(`×${segment.repeat}`);
  }

  const distance = formatDistanceRange(
    segment.distanceKmMin ?? segment.distanceKm,
    segment.distanceKmMax ?? segment.distanceKm,
  );
  if (distance) parts.push(distance);

  if (segment.durationMinutes != null) {
    parts.push(`${segment.durationMinutes} min`);
  }

  if (segment.paceMinPerKm != null || segment.paceMaxPerKm != null) {
    const min =
      segment.paceMinPerKm != null
        ? formatPaceMinPerKm(segment.paceMinPerKm)
        : null;
    const max =
      segment.paceMaxPerKm != null
        ? formatPaceMinPerKm(segment.paceMaxPerKm)
        : null;
    if (min && max && min !== max) {
      parts.push(`${min.replace(" /km", "")}–${max}`);
    } else if (min) {
      parts.push(min);
    } else if (max) {
      parts.push(max);
    }
  }

  if (segment.hrMin != null || segment.hrMax != null) {
    if (segment.hrMin != null && segment.hrMax != null) {
      parts.push(`HR ${segment.hrMin}–${segment.hrMax}`);
    } else if (segment.hrMin != null) {
      parts.push(`HR ≥${segment.hrMin}`);
    } else if (segment.hrMax != null) {
      parts.push(`HR ≤${segment.hrMax}`);
    }
  }

  return parts.join(" · ");
}
