import type { SessionType } from "@/models/shared";

export type ProgressActivitySummary = {
  id: string;
  distanceKm: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
  startedAt: string;
};

export type ProgressSession = {
  order: number;
  scheduledDate: string;
  title: string;
  type: SessionType;
  purpose: string;
  totalDistanceKmMin?: number;
  totalDistanceKmMax?: number;
  paceMinPerKm?: number;
  paceMaxPerKm?: number;
  status: "open" | "matched";
  activity?: ProgressActivitySummary;
  activityUnavailable?: boolean;
};

export type ProgressMatchedTimelineItem = {
  kind: "matched";
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

export type ProgressUnplannedTimelineItem = {
  kind: "unplanned";
  date: string;
  activity: ProgressActivitySummary;
};

export type ProgressTimelineItem =
  | ProgressMatchedTimelineItem
  | ProgressUnplannedTimelineItem;

export type ProgressFollowUp = {
  thisWeek: {
    planId: string;
    sessions: ProgressSession[];
  } | null;
  history: ProgressTimelineItem[];
};
