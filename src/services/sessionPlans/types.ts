import type { PlannedSessionStatus } from "@/models/SessionPlan";
import type { SegmentKind, SessionType } from "@/models/shared";

export type SessionSegmentSummary = {
  kind: SegmentKind;
  repeat?: number;
  distanceKm?: number;
  distanceKmMin?: number;
  distanceKmMax?: number;
  durationMinutes?: number;
  paceMinPerKm?: number;
  paceMaxPerKm?: number;
  hrMin?: number;
  hrMax?: number;
  notes?: string;
};

export type PlannedSessionSummary = {
  order: number;
  scheduledDate: string;
  title: string;
  type: SessionType;
  purpose: string;
  totalDistanceKmMin?: number;
  totalDistanceKmMax?: number;
  coachingNotes: string[];
  segments: SessionSegmentSummary[];
  status: PlannedSessionStatus;
  activityId?: string;
  matchedAt?: string;
};

export type SessionPlanSummary = {
  id: string;
  generatedAt: string;
  rationale?: string;
  sessions: PlannedSessionSummary[];
};
