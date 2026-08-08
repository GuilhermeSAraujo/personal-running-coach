import { SEGMENT_KINDS, SESSION_TYPES } from "@/models";
import { rollingWeekDates } from "./planWindow";
import type {
  AiNextSessionsResponse,
  AiPlannedSession,
  AiSessionSegment,
} from "./types";

const WEEK_LENGTH = 7;
const SCHEDULED_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "number";
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function assertSegment(value: unknown, path: string): AiSessionSegment {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object`);
  }

  if (
    typeof value.kind !== "string" ||
    !(SEGMENT_KINDS as readonly string[]).includes(value.kind)
  ) {
    throw new Error(`${path}.kind must be a valid SegmentKind`);
  }

  for (const key of [
    "repeat",
    "distanceKm",
    "distanceKmMin",
    "distanceKmMax",
    "durationMinutes",
    "paceMinPerKm",
    "paceMaxPerKm",
    "hrMin",
    "hrMax",
  ] as const) {
    if (!isOptionalNumber(value[key])) {
      throw new Error(`${path}.${key} must be a number when present`);
    }
  }

  if (!isOptionalString(value.notes)) {
    throw new Error(`${path}.notes must be a string when present`);
  }

  const segment: AiSessionSegment = { kind: value.kind as AiSessionSegment["kind"] };

  if (typeof value.repeat === "number") segment.repeat = value.repeat;
  if (typeof value.distanceKm === "number") segment.distanceKm = value.distanceKm;
  if (typeof value.distanceKmMin === "number") {
    segment.distanceKmMin = value.distanceKmMin;
  }
  if (typeof value.distanceKmMax === "number") {
    segment.distanceKmMax = value.distanceKmMax;
  }
  if (typeof value.durationMinutes === "number") {
    segment.durationMinutes = value.durationMinutes;
  }
  if (typeof value.paceMinPerKm === "number") {
    segment.paceMinPerKm = value.paceMinPerKm;
  }
  if (typeof value.paceMaxPerKm === "number") {
    segment.paceMaxPerKm = value.paceMaxPerKm;
  }
  if (typeof value.hrMin === "number") segment.hrMin = value.hrMin;
  if (typeof value.hrMax === "number") segment.hrMax = value.hrMax;
  if (typeof value.notes === "string") segment.notes = value.notes;

  return segment;
}

function assertSession(value: unknown, path: string): AiPlannedSession {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object`);
  }

  if (typeof value.order !== "number") {
    throw new Error(`${path}.order must be a number`);
  }
  if (
    typeof value.scheduledDate !== "string" ||
    !SCHEDULED_DATE_PATTERN.test(value.scheduledDate)
  ) {
    throw new Error(`${path}.scheduledDate must be a YYYY-MM-DD string`);
  }
  if (typeof value.title !== "string" || value.title.trim() === "") {
    throw new Error(`${path}.title must be a non-empty string`);
  }
  if (
    typeof value.type !== "string" ||
    !(SESSION_TYPES as readonly string[]).includes(value.type)
  ) {
    throw new Error(`${path}.type must be a valid SessionType`);
  }
  if (typeof value.purpose !== "string" || value.purpose.trim() === "") {
    throw new Error(`${path}.purpose must be a non-empty string`);
  }
  if (!isOptionalNumber(value.totalDistanceKmMin)) {
    throw new Error(`${path}.totalDistanceKmMin must be a number when present`);
  }
  if (!isOptionalNumber(value.totalDistanceKmMax)) {
    throw new Error(`${path}.totalDistanceKmMax must be a number when present`);
  }
  if (
    !Array.isArray(value.coachingNotes) ||
    !value.coachingNotes.every((note) => typeof note === "string")
  ) {
    throw new Error(`${path}.coachingNotes must be an array of strings`);
  }
  if (!Array.isArray(value.segments)) {
    throw new Error(`${path}.segments must be an array`);
  }

  const isRest = value.type === "rest";

  if (isRest) {
    if (value.segments.length !== 0) {
      throw new Error(`${path}.segments must be empty for rest sessions`);
    }
    if (value.totalDistanceKmMin != null || value.totalDistanceKmMax != null) {
      throw new Error(
        `${path} must not set distance fields for rest sessions`,
      );
    }
  } else if (value.segments.length < 1) {
    throw new Error(`${path}.segments must be a non-empty array`);
  }

  const session: AiPlannedSession = {
    order: value.order,
    scheduledDate: value.scheduledDate,
    title: value.title,
    type: value.type as AiPlannedSession["type"],
    purpose: value.purpose,
    coachingNotes: value.coachingNotes,
    segments: value.segments.map((segment, index) =>
      assertSegment(segment, `${path}.segments[${index}]`),
    ),
  };

  if (!isRest && typeof value.totalDistanceKmMin === "number") {
    session.totalDistanceKmMin = value.totalDistanceKmMin;
  }
  if (!isRest && typeof value.totalDistanceKmMax === "number") {
    session.totalDistanceKmMax = value.totalDistanceKmMax;
  }

  return session;
}

/** Validates and normalizes Gemini JSON into a typed next-sessions payload. */
export function validateSessionPlanResponse(
  value: unknown,
  options?: { now?: Date },
): AiNextSessionsResponse {
  if (!isRecord(value)) {
    throw new Error("AI response must be an object");
  }

  if (!isOptionalString(value.rationale)) {
    throw new Error("rationale must be a string when present");
  }

  if (!Array.isArray(value.sessions) || value.sessions.length !== WEEK_LENGTH) {
    throw new Error("sessions must contain exactly 7 items");
  }

  const sessions = value.sessions.map((session, index) =>
    assertSession(session, `sessions[${index}]`),
  );

  const orders = sessions
    .map((session) => session.order)
    .sort((a, b) => a - b);
  if (!orders.every((order, index) => order === index + 1)) {
    throw new Error("sessions must have orders 1 through 7");
  }

  if (!sessions.some((session) => session.type !== "rest")) {
    throw new Error("sessions must include at least one non-rest session");
  }

  const expectedDates = rollingWeekDates(options?.now ?? new Date());
  const byDate = [...sessions].sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate),
  );
  for (let i = 0; i < WEEK_LENGTH; i++) {
    if (byDate[i]!.order !== i + 1) {
      throw new Error(
        "sessions must have orders 1 through 7 in chronological date order",
      );
    }
    if (byDate[i]!.scheduledDate !== expectedDates[i]) {
      throw new Error(
        `sessions must cover each date in the rolling week (${expectedDates[0]}…${expectedDates[6]})`,
      );
    }
  }

  const response: AiNextSessionsResponse = {
    sessions: [...sessions].sort((a, b) => a.order - b.order),
  };

  if (typeof value.rationale === "string") {
    response.rationale = value.rationale;
  }

  return response;
}
