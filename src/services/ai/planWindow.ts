const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): Date {
  const start = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return new Date(start + days * MS_PER_DAY);
}

export function rollingWeekDates(now: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => utcDateString(addUtcDays(now, i)));
}

export function rollingWeekWindow(now: Date): {
  startDate: string;
  endDate: string;
} {
  const dates = rollingWeekDates(now);
  return { startDate: dates[0]!, endDate: dates[6]! };
}
