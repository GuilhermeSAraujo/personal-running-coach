import type { SessionType } from "@/models/shared";
import type { ISessionSegment } from "@/models/SessionPlan";

export type ActivityForMatch = {
  id: string;
  startedAt: Date;
  distanceKm: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
  heartRateAvg?: number;
};

export type SessionForMatch = {
  order: number;
  title: string;
  type: SessionType;
  totalDistanceKmMin?: number;
  totalDistanceKmMax?: number;
  segments: ISessionSegment[];
};

export type MatchSuggestion = {
  activityId: string;
  sessionOrder: number;
  score: number;
  reasons: string[];
};

export type ScoreResult = {
  score: number;
  reasons: string[];
};

export type SyncActivitySummary = {
  id: string;
  startedAt: string;
  distanceKm: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
  type: string;
};

export type SyncOpenSessionSummary = {
  order: number;
  title: string;
  type: string;
  scheduledDate: string;
};

/** Minimum combined score to emit a suggestion. */
export const MATCH_SCORE_THRESHOLD = 0.35;
