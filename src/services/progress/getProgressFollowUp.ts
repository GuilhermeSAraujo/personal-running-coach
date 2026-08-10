import { dbConnect } from "@/lib/db";
import { Activity, SessionPlan, type IActivity, type IPlannedSession } from "@/models";
import type { SessionType } from "@/models/shared";
import type { Types } from "mongoose";
import type {
  ProgressActivitySummary,
  ProgressFollowUp,
  ProgressSession,
  ProgressTimelineItem,
} from "./types";

const HISTORY_DAYS = 28;
const PLAN_SCAN_LIMIT = 20;

type LeanActivity = Pick<
  IActivity,
  "distanceKm" | "durationSeconds" | "paceSecondsPerKm" | "startedAt"
> & { _id: Types.ObjectId };

export type PriorMatchedSession = {
  scheduledDate: string;
  title: string;
  type: SessionType;
  purpose: string;
  totalDistanceKmMin?: number;
  totalDistanceKmMax?: number;
  paceMinPerKm?: number;
  paceMaxPerKm?: number;
  activity?: ProgressActivitySummary;
  activityUnavailable?: boolean;
};

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function windowStartDate(now = new Date()): Date {
  return new Date(now.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000);
}

function toActivitySummary(doc: LeanActivity): ProgressActivitySummary {
  return {
    id: String(doc._id),
    distanceKm: doc.distanceKm,
    durationSeconds: doc.durationSeconds,
    paceSecondsPerKm: doc.paceSecondsPerKm,
    startedAt: doc.startedAt.toISOString(),
  };
}

function sessionPaceRange(session: IPlannedSession): {
  paceMinPerKm?: number;
  paceMaxPerKm?: number;
} {
  let paceMinPerKm: number | undefined;
  let paceMaxPerKm: number | undefined;
  for (const segment of session.segments ?? []) {
    if (segment.paceMinPerKm != null) {
      paceMinPerKm =
        paceMinPerKm == null
          ? segment.paceMinPerKm
          : Math.min(paceMinPerKm, segment.paceMinPerKm);
    }
    if (segment.paceMaxPerKm != null) {
      paceMaxPerKm =
        paceMaxPerKm == null
          ? segment.paceMaxPerKm
          : Math.max(paceMaxPerKm, segment.paceMaxPerKm);
    }
  }
  return {
    ...(paceMinPerKm != null ? { paceMinPerKm } : {}),
    ...(paceMaxPerKm != null ? { paceMaxPerKm } : {}),
  };
}

function isInHistoryWindow(
  scheduledDate: string,
  activity: ProgressActivitySummary | undefined,
  windowStartStr: string,
  todayStr: string,
): boolean {
  if (scheduledDate >= windowStartStr && scheduledDate <= todayStr) {
    return true;
  }
  if (activity) {
    const activityDate = activity.startedAt.slice(0, 10);
    return activityDate >= windowStartStr && activityDate <= todayStr;
  }
  return false;
}

export function timelineSortKey(item: ProgressTimelineItem): string {
  if (item.kind === "unplanned") {
    return `${item.date}T${item.activity.startedAt}`;
  }
  const activityDate = item.activity?.startedAt.slice(0, 10);
  return `${activityDate ?? item.scheduledDate}T${item.activity?.startedAt ?? item.scheduledDate}`;
}

/** Newest first. */
export function sortHistoryNewestFirst(
  history: ProgressTimelineItem[],
): ProgressTimelineItem[] {
  return [...history].sort((a, b) =>
    timelineSortKey(b).localeCompare(timelineSortKey(a)),
  );
}

/**
 * First match for each scheduledDate wins (call with plans newest-first so
 * the most recent superseded match is preferred).
 */
export function buildPriorMatchByDate(
  matches: PriorMatchedSession[],
): Map<string, PriorMatchedSession> {
  const map = new Map<string, PriorMatchedSession>();
  for (const match of matches) {
    if (!map.has(match.scheduledDate)) {
      map.set(match.scheduledDate, match);
    }
  }
  return map;
}

export function overlayPriorMatchesOnThisWeek(
  sessions: ProgressSession[],
  priorByDate: Map<string, PriorMatchedSession>,
): ProgressSession[] {
  return sessions.map((session) => {
    if (session.status !== "open") return session;
    const prior = priorByDate.get(session.scheduledDate);
    if (!prior) return session;
    return {
      order: session.order,
      scheduledDate: session.scheduledDate,
      title: prior.title,
      type: prior.type,
      purpose: prior.purpose,
      ...(prior.totalDistanceKmMin != null
        ? { totalDistanceKmMin: prior.totalDistanceKmMin }
        : {}),
      ...(prior.totalDistanceKmMax != null
        ? { totalDistanceKmMax: prior.totalDistanceKmMax }
        : {}),
      ...(prior.paceMinPerKm != null ? { paceMinPerKm: prior.paceMinPerKm } : {}),
      ...(prior.paceMaxPerKm != null ? { paceMaxPerKm: prior.paceMaxPerKm } : {}),
      status: "matched" as const,
      ...(prior.activity ? { activity: prior.activity } : {}),
      ...(prior.activityUnavailable ? { activityUnavailable: true } : {}),
    };
  });
}

export function matchedDatesInThisWeek(sessions: ProgressSession[]): Set<string> {
  const dates = new Set<string>();
  for (const session of sessions) {
    if (session.status === "matched") {
      dates.add(session.scheduledDate);
    }
  }
  return dates;
}

function toProgressSession(
  session: IPlannedSession,
  activityById: Map<string, ProgressActivitySummary>,
): ProgressSession | null {
  if (session.status === "skipped") return null;

  const status = session.status === "matched" ? "matched" : "open";
  const activityId =
    session.activityId != null ? String(session.activityId) : undefined;
  const activity = activityId ? activityById.get(activityId) : undefined;
  const pace = sessionPaceRange(session);

  return {
    order: session.order,
    scheduledDate: session.scheduledDate,
    title: session.title,
    type: session.type,
    purpose: session.purpose,
    ...(session.totalDistanceKmMin != null
      ? { totalDistanceKmMin: session.totalDistanceKmMin }
      : {}),
    ...(session.totalDistanceKmMax != null
      ? { totalDistanceKmMax: session.totalDistanceKmMax }
      : {}),
    ...pace,
    status,
    ...(activity ? { activity } : {}),
    ...(status === "matched" && activityId && !activity
      ? { activityUnavailable: true }
      : {}),
  };
}

function toPriorMatchedSession(
  session: IPlannedSession,
  activityById: Map<string, ProgressActivitySummary>,
): PriorMatchedSession | null {
  if (session.status !== "matched") return null;

  const activityId =
    session.activityId != null ? String(session.activityId) : undefined;
  const activity = activityId ? activityById.get(activityId) : undefined;
  const pace = sessionPaceRange(session);

  return {
    scheduledDate: session.scheduledDate,
    title: session.title,
    type: session.type,
    purpose: session.purpose,
    ...(session.totalDistanceKmMin != null
      ? { totalDistanceKmMin: session.totalDistanceKmMin }
      : {}),
    ...(session.totalDistanceKmMax != null
      ? { totalDistanceKmMax: session.totalDistanceKmMax }
      : {}),
    ...pace,
    ...(activity ? { activity } : {}),
    ...(activityId && !activity ? { activityUnavailable: true } : {}),
  };
}

export async function getProgressFollowUp(
  userId: Types.ObjectId | string,
): Promise<ProgressFollowUp> {
  await dbConnect();

  const now = new Date();
  const windowStart = windowStartDate(now);
  const windowStartStr = toUtcDateString(windowStart);
  const todayStr = toUtcDateString(now);

  const [openPlan, plans, activities] = await Promise.all([
    SessionPlan.findOne({
      userId,
      $or: [{ status: "open" }, { status: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .lean(),
    SessionPlan.find({ userId })
      .sort({ createdAt: -1 })
      .limit(PLAN_SCAN_LIMIT)
      .lean(),
    Activity.find({
      userId,
      startedAt: { $gte: windowStart },
    })
      .select("distanceKm durationSeconds paceSecondsPerKm startedAt")
      .lean(),
  ]);

  const activityById = new Map<string, ProgressActivitySummary>();
  for (const activity of activities) {
    activityById.set(String(activity._id), toActivitySummary(activity));
  }

  // Also resolve matched activity ids that may fall slightly outside the
  // startedAt query window but are still linked from plans in the scan.
  const missingActivityIds: Types.ObjectId[] = [];
  for (const plan of plans) {
    for (const session of plan.sessions ?? []) {
      if (session.status !== "matched" || session.activityId == null) continue;
      const id = String(session.activityId);
      if (!activityById.has(id)) {
        missingActivityIds.push(session.activityId as Types.ObjectId);
      }
    }
  }
  if (missingActivityIds.length > 0) {
    const extras = await Activity.find({
      userId,
      _id: { $in: missingActivityIds },
    })
      .select("distanceKm durationSeconds paceSecondsPerKm startedAt")
      .lean();
    for (const activity of extras) {
      activityById.set(String(activity._id), toActivitySummary(activity));
    }
  }

  const openPlanId = openPlan ? String(openPlan._id) : null;

  const priorMatches: PriorMatchedSession[] = [];
  for (const plan of plans) {
    for (const session of plan.sessions ?? []) {
      const prior = toPriorMatchedSession(session, activityById);
      if (prior) priorMatches.push(prior);
    }
  }
  const priorByDate = buildPriorMatchByDate(priorMatches);

  let thisWeek: ProgressFollowUp["thisWeek"] = null;
  if (openPlan) {
    const sessions = overlayPriorMatchesOnThisWeek(
      [...(openPlan.sessions ?? [])]
        .sort((a, b) => a.order - b.order)
        .map((session) => toProgressSession(session, activityById))
        .filter((session): session is ProgressSession => session != null),
      priorByDate,
    );

    thisWeek = {
      planId: String(openPlan._id),
      sessions,
    };
  }

  const thisWeekMatchedDates = matchedDatesInThisWeek(
    thisWeek?.sessions ?? [],
  );

  const matchedActivityIds = new Set<string>();
  for (const plan of plans) {
    for (const session of plan.sessions ?? []) {
      if (session.status === "matched" && session.activityId != null) {
        matchedActivityIds.add(String(session.activityId));
      }
    }
  }

  const history: ProgressTimelineItem[] = [];

  for (const plan of plans) {
    if (openPlanId && String(plan._id) === openPlanId) continue;

    for (const session of plan.sessions ?? []) {
      if (session.status !== "matched") continue;
      // Already shown as Done under This week (including overlay).
      if (thisWeekMatchedDates.has(session.scheduledDate)) continue;

      const activityId =
        session.activityId != null ? String(session.activityId) : undefined;
      const activity = activityId ? activityById.get(activityId) : undefined;

      if (
        !isInHistoryWindow(
          session.scheduledDate,
          activity,
          windowStartStr,
          todayStr,
        )
      ) {
        continue;
      }

      const pace = sessionPaceRange(session);
      history.push({
        kind: "matched",
        scheduledDate: session.scheduledDate,
        title: session.title,
        type: session.type,
        purpose: session.purpose,
        ...(session.totalDistanceKmMin != null
          ? { totalDistanceKmMin: session.totalDistanceKmMin }
          : {}),
        ...(session.totalDistanceKmMax != null
          ? { totalDistanceKmMax: session.totalDistanceKmMax }
          : {}),
        ...pace,
        ...(activity ? { activity } : {}),
        ...(activityId && !activity ? { activityUnavailable: true } : {}),
      });
    }
  }

  for (const activity of activities) {
    const id = String(activity._id);
    if (matchedActivityIds.has(id)) continue;
    const summary = activityById.get(id);
    if (!summary) continue;
    history.push({
      kind: "unplanned",
      date: summary.startedAt.slice(0, 10),
      activity: summary,
    });
  }

  return { thisWeek, history: sortHistoryNewestFirst(history) };
}
