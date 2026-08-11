import type { ContinuityContext, ContinuitySession } from "./buildContinuityContext";

export type { ContinuityContext } from "./buildContinuityContext";

type SegmentLike = {
  kind?: string;
  distanceKm?: number;
  durationMinutes?: number;
  paceMinPerKm?: number;
  paceMaxPerKm?: number;
  repeat?: number;
  notes?: string;
};

function formatSegment(segment: unknown): string | null {
  if (!segment || typeof segment !== "object") return null;
  const s = segment as SegmentLike;
  if (!s.kind) return null;

  const parts: string[] = [s.kind];
  if (s.repeat != null && s.repeat > 1) parts.push(`x${s.repeat}`);
  if (s.distanceKm != null) parts.push(`${s.distanceKm}km`);
  if (s.durationMinutes != null) parts.push(`${s.durationMinutes}min`);
  if (s.paceMinPerKm != null) {
    const pace =
      s.paceMaxPerKm != null && s.paceMaxPerKm !== s.paceMinPerKm
        ? `${s.paceMinPerKm}-${s.paceMaxPerKm}`
        : String(s.paceMinPerKm);
    parts.push(`@${pace}`);
  }
  if (s.notes) parts.push(`(${s.notes})`);
  return parts.join(" ");
}

function formatSession(session: ContinuitySession): string {
  const date = session.scheduledDate ?? `order${session.order}`;
  const lines = [
    `${date} type=${session.type} title=${session.title}`,
    `purpose=${session.purpose}`,
  ];

  const segmentLines = session.segments
    .map(formatSegment)
    .filter((line): line is string => line != null);
  if (segmentLines.length > 0) {
    lines.push(`segments: ${segmentLines.join("; ")}`);
  }

  if (session.coachingNotes.length > 0) {
    const notes = session.coachingNotes.join("; ");
    lines.push(`notes=${notes.length > 160 ? `${notes.slice(0, 157)}...` : notes}`);
  }

  return lines.join("\n");
}

export function formatContinuityForPrompt(ctx: ContinuityContext): string {
  const lines = [
    "PLAN_CONTINUITY",
    `week=${ctx.window.startDate} → ${ctx.window.endDate}`,
    "",
    "COMPLETED",
  ];

  if (ctx.completedSessions.length === 0) {
    lines.push("none");
  } else {
    for (const session of ctx.completedSessions) {
      lines.push(formatSession(session));
      lines.push("");
    }
  }

  lines.push("REMAINING");
  if (ctx.remainingSessions.length === 0) {
    lines.push("none");
  } else {
    for (const session of ctx.remainingSessions) {
      lines.push(formatSession(session));
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd();
}
