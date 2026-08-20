export function sessionPlanDayPath(planId: string, date: string): string {
  return `/session-plans/${planId}?date=${date}`;
}

export function resolveOpenSessionDate(
  sessions: { scheduledDate: string }[],
  dateParam: string | null | undefined,
): string | null {
  if (!dateParam) return null;
  return sessions.some((session) => session.scheduledDate === dateParam)
    ? dateParam
    : null;
}
