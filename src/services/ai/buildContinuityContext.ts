import { rollingWeekWindow } from "./planWindow";
import type { SessionType } from "@/models";

export type ContinuityPlanSession = {
  order: number;
  title: string;
  type: SessionType | string;
  purpose: string;
  scheduledDate?: string;
  coachingNotes?: string[];
  segments?: unknown[];
  status?: string;
  activityId?: unknown;
};

export type ContinuitySession = {
  order: number;
  title: string;
  type: string;
  purpose: string;
  scheduledDate?: string;
  coachingNotes: string[];
  segments: unknown[];
  activityId?: string;
};

export type ContinuityContext = {
  window: { startDate: string; endDate: string };
  completedSessions: ContinuitySession[];
  remainingSessions: ContinuitySession[];
};

/** Source shape for a persisted planned session (e.g. a SessionPlan document's `sessions[i]`). */
type PriorPlanSessionSource = {
  order: number;
  title: string;
  type: SessionType | string;
  purpose: string;
  scheduledDate: string;
  coachingNotes: string[];
  segments: unknown[];
  status: string;
  activityId?: unknown;
};

/** Maps persisted session subdocuments into the shape `generateAthleteSnapshot`'s `priorPlan` expects. */
export function toPriorPlanSessions(
  sessions: PriorPlanSessionSource[],
): ContinuityPlanSession[] {
  return sessions.map((s) => ({
    order: s.order,
    title: s.title,
    type: s.type,
    purpose: s.purpose,
    scheduledDate: s.scheduledDate,
    coachingNotes: s.coachingNotes,
    segments: s.segments,
    status: s.status,
    activityId: s.activityId,
  }));
}

function toContinuitySession(session: ContinuityPlanSession): ContinuitySession {
  const out: ContinuitySession = {
    order: session.order,
    title: session.title,
    type: String(session.type),
    purpose: session.purpose,
    coachingNotes: session.coachingNotes ?? [],
    segments: session.segments ?? [],
  };
  if (session.scheduledDate) out.scheduledDate = session.scheduledDate;
  if (session.activityId != null) out.activityId = String(session.activityId);
  return out;
}

export function buildContinuityContext(
  plan: { sessions: ContinuityPlanSession[] },
  now: Date = new Date(),
): ContinuityContext {
  const completedSessions: ContinuitySession[] = [];
  const remainingSessions: ContinuitySession[] = [];

  for (const session of plan.sessions) {
    const mapped = toContinuitySession(session);
    if (session.status === "matched") {
      completedSessions.push(mapped);
      continue;
    }
    if (session.status == null || session.status === "open") {
      remainingSessions.push(mapped);
    }
  }

  completedSessions.sort((a, b) => a.order - b.order);
  remainingSessions.sort((a, b) => a.order - b.order);

  return {
    window: rollingWeekWindow(now),
    completedSessions,
    remainingSessions,
  };
}
