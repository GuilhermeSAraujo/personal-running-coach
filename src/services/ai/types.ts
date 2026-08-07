import type { SegmentKind, SessionType } from "@/models";

/** AI JSON response for the next 3 sessions (natural-language fields in pt-BR). */
export interface AiSessionSegment {
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
}

export interface AiPlannedSession {
  order: number;
  title: string;
  type: SessionType;
  purpose: string;
  totalDistanceKmMin?: number;
  totalDistanceKmMax?: number;
  coachingNotes: string[];
  segments: AiSessionSegment[];
}

export interface AiNextSessionsResponse {
  rationale?: string;
  sessions: AiPlannedSession[];
}
