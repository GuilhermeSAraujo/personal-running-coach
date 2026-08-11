export type PaceTrend = "improving" | "stable" | "declining";

export type MetricsKpis = {
  currentWeekVolumeKm: number;
  averageRunsPerWeek4w: number;
  currentLongestKm: number;
  paceTrend: PaceTrend | null;
};

export type MetricsWeekPoint = {
  weekStart: string;
  label: string;
  distanceKm: number;
  runs: number;
  longestRunKm: number;
  averagePaceSecondsPerKm: number | null;
};

export type MetricsDashboardEmpty = {
  empty: true;
};

export type MetricsDashboardData = {
  empty: false;
  generatedAt: string;
  kpis: MetricsKpis;
  weeks: MetricsWeekPoint[];
};

export type MetricsDashboard = MetricsDashboardEmpty | MetricsDashboardData;
