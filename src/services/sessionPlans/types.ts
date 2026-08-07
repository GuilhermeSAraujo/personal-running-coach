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
  title: string;
  type: SessionType;
  purpose: string;
  totalDistanceKmMin?: number;
  totalDistanceKmMax?: number;
  coachingNotes: string[];
  segments: SessionSegmentSummary[];
};

export type SessionPlanSummary = {
  id: string;
  generatedAt: string;
  rationale?: string;
  sessions: PlannedSessionSummary[];
};
