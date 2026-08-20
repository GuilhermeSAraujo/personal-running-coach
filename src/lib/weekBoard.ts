import { rollingWeekDates } from "@/services/ai/planWindow";
import type {
  ProgressMatchedTimelineItem,
  ProgressSession,
  ProgressTimelineItem,
} from "@/services/progress/types";

function historySortKey(item: ProgressTimelineItem): string {
  if (item.kind === "unplanned") {
    return `${item.date}T${item.activity.startedAt}`;
  }
  const activityDate = item.activity?.startedAt.slice(0, 10);
  return `${activityDate ?? item.scheduledDate}T${item.activity?.startedAt ?? item.scheduledDate}`;
}

function sortHistoryNewestFirst(
  history: ProgressTimelineItem[],
): ProgressTimelineItem[] {
  return [...history].sort((a, b) =>
    historySortKey(b).localeCompare(historySortKey(a)),
  );
}

export type WeekDayStatus = "open" | "matched" | "rest" | "empty";

export type WeekDay = {
  date: string;
  isToday: boolean;
  status: WeekDayStatus;
  session: ProgressSession | null;
};

function statusForSession(session: ProgressSession): WeekDayStatus {
  if (session.type === "rest") return "rest";
  if (session.status === "matched") return "matched";
  return "open";
}

export function buildWeekBoard(
  sessions: ProgressSession[],
  now: Date = new Date(),
): WeekDay[] {
  const byDate = new Map<string, ProgressSession>();
  for (const session of sessions) {
    byDate.set(session.scheduledDate, session);
  }

  return rollingWeekDates(now).map((date, index) => {
    const session = byDate.get(date) ?? null;
    return {
      date,
      isToday: index === 0,
      status: session ? statusForSession(session) : "empty",
      session,
    };
  });
}

export function selectWeekDay(
  days: WeekDay[],
  selectedDate: string | null,
): WeekDay {
  const today = days[0];
  if (!today) {
    throw new Error("week board must have 7 days");
  }
  if (selectedDate == null) return today;
  return days.find((day) => day.date === selectedDate) ?? today;
}

function toMatchedHistoryItem(
  session: ProgressSession,
): ProgressMatchedTimelineItem {
  return {
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
    ...(session.paceMinPerKm != null ? { paceMinPerKm: session.paceMinPerKm } : {}),
    ...(session.paceMaxPerKm != null ? { paceMaxPerKm: session.paceMaxPerKm } : {}),
    ...(session.activity ? { activity: session.activity } : {}),
    ...(session.activityUnavailable ? { activityUnavailable: true } : {}),
  };
}

export function buildHomeHistory(
  thisWeekSessions: ProgressSession[],
  history: ProgressTimelineItem[],
  today: string,
): ProgressTimelineItem[] {
  const pastMatched = thisWeekSessions
    .filter(
      (session) =>
        session.scheduledDate < today &&
        session.status === "matched" &&
        session.type !== "rest",
    )
    .map(toMatchedHistoryItem);

  return sortHistoryNewestFirst([...pastMatched, ...history]);
}
