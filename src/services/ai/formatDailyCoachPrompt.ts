import type { IUserGoal } from "@/models";
import type {
  ProgressFollowUp,
  ProgressSession,
  ProgressTimelineItem,
} from "@/services/progress/types";
import { formatClockDuration } from "./formatCompactSnapshotForPrompt";

const PLAN_VS_RUNS_DAYS = 14;

export type DailyCoachPromptInput = {
  goal: IUserGoal;
  progress: ProgressFollowUp;
  now?: Date;
};

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function formatKm(n: number): string {
  return String(round(n, 1));
}

function windowStartStr(today: string): string {
  const start = new Date(`${today}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - (PLAN_VS_RUNS_DAYS - 1));
  return toUtcDateString(start);
}

function inWindow(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function formatPlannedKm(session: {
  totalDistanceKmMin?: number;
  totalDistanceKmMax?: number;
}): string | null {
  if (session.totalDistanceKmMin == null && session.totalDistanceKmMax == null) {
    return null;
  }
  if (
    session.totalDistanceKmMin != null &&
    session.totalDistanceKmMax != null &&
    session.totalDistanceKmMin !== session.totalDistanceKmMax
  ) {
    return `${formatKm(session.totalDistanceKmMin)}-${formatKm(session.totalDistanceKmMax)}km`;
  }
  const km = session.totalDistanceKmMin ?? session.totalDistanceKmMax;
  return km != null ? `${formatKm(km)}km` : null;
}

function formatActual(activity: {
  distanceKm: number;
  paceSecondsPerKm: number;
}): string {
  const paceMin = round(activity.paceSecondsPerKm / 60, 2);
  return `actual=${formatKm(activity.distanceKm)}km pace=${paceMin}`;
}

function formatGoal(goal: IUserGoal): string {
  return [
    "GOAL",
    `type=${goal.type}`,
    `distance=${formatKm(goal.distanceKm)}km`,
    `targetTime=${formatClockDuration(goal.targetTimeSeconds)}`,
    `targetDate=${toUtcDateString(goal.targetDate)}`,
  ].join("\n");
}

function formatThisWeekSession(session: ProgressSession): string {
  const parts = [
    session.scheduledDate,
    `type=${session.type}`,
    `title=${session.title}`,
    `status=${session.status}`,
  ];
  const planned = formatPlannedKm(session);
  if (planned) parts.push(`planned=${planned}`);
  if (session.activity) parts.push(formatActual(session.activity));
  return parts.join(" ");
}

function formatHistoryItem(item: ProgressTimelineItem): string {
  if (item.kind === "unplanned") {
    return `${item.date} unplanned ${formatActual(item.activity)}`;
  }
  const parts = [
    item.scheduledDate,
    `type=${item.type}`,
    `title=${item.title}`,
    "status=matched",
  ];
  const planned = formatPlannedKm(item);
  if (planned) parts.push(`planned=${planned}`);
  if (item.activity) parts.push(formatActual(item.activity));
  return parts.join(" ");
}

function collectPlanVsRuns(
  progress: ProgressFollowUp,
  start: string,
  today: string,
): string[] {
  const lines: string[] = [];

  for (const session of progress.thisWeek?.sessions ?? []) {
    if (!inWindow(session.scheduledDate, start, today)) continue;
    lines.push(formatThisWeekSession(session));
  }

  for (const item of progress.history) {
    const date = item.kind === "unplanned" ? item.date : item.scheduledDate;
    if (!inWindow(date, start, today)) continue;
    lines.push(formatHistoryItem(item));
  }

  lines.sort((a, b) => a.slice(0, 10).localeCompare(b.slice(0, 10)));
  return lines;
}

export function formatDailyCoachPrompt(input: DailyCoachPromptInput): string {
  const now = input.now ?? new Date();
  const today = toUtcDateString(now);
  const start = windowStartStr(today);
  const planLines = collectPlanVsRuns(input.progress, start, today);

  return [
    ["TODAY", `date=${today}`].join("\n"),
    formatGoal(input.goal),
    ["PLAN_VS_RUNS", planLines.length > 0 ? planLines.join("\n") : "none"].join(
      "\n",
    ),
  ].join("\n\n");
}
