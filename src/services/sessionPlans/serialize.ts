import type {
  IPlannedSession,
  ISessionPlan,
  ISessionSegment,
} from "@/models/SessionPlan";
import type { Types } from "mongoose";
import type {
  PlannedSessionSummary,
  SessionPlanSummary,
  SessionSegmentSummary,
} from "./types";

type LeanSessionPlan = Omit<ISessionPlan, "userId" | "athleteSnapshotId"> & {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  athleteSnapshotId: Types.ObjectId;
};

function toSegment(segment: ISessionSegment): SessionSegmentSummary {
  return {
    kind: segment.kind,
    ...(segment.repeat != null ? { repeat: segment.repeat } : {}),
    ...(segment.distanceKm != null ? { distanceKm: segment.distanceKm } : {}),
    ...(segment.distanceKmMin != null
      ? { distanceKmMin: segment.distanceKmMin }
      : {}),
    ...(segment.distanceKmMax != null
      ? { distanceKmMax: segment.distanceKmMax }
      : {}),
    ...(segment.durationMinutes != null
      ? { durationMinutes: segment.durationMinutes }
      : {}),
    ...(segment.paceMinPerKm != null
      ? { paceMinPerKm: segment.paceMinPerKm }
      : {}),
    ...(segment.paceMaxPerKm != null
      ? { paceMaxPerKm: segment.paceMaxPerKm }
      : {}),
    ...(segment.hrMin != null ? { hrMin: segment.hrMin } : {}),
    ...(segment.hrMax != null ? { hrMax: segment.hrMax } : {}),
    ...(segment.notes != null ? { notes: segment.notes } : {}),
  };
}

function toSession(session: IPlannedSession): PlannedSessionSummary {
  return {
    order: session.order,
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
    coachingNotes: session.coachingNotes ?? [],
    segments: (session.segments ?? []).map(toSegment),
    status: session.status ?? "open",
    ...(session.activityId != null
      ? { activityId: String(session.activityId) }
      : {}),
    ...(session.matchedAt != null
      ? { matchedAt: session.matchedAt.toISOString() }
      : {}),
  };
}

export function toSessionPlanSummary(doc: LeanSessionPlan): SessionPlanSummary {
  return {
    id: String(doc._id),
    generatedAt: doc.generatedAt.toISOString(),
    ...(doc.rationale != null ? { rationale: doc.rationale } : {}),
    sessions: [...doc.sessions]
      .sort((a, b) => a.order - b.order)
      .map(toSession),
  };
}
