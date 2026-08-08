import assert from "node:assert/strict";
import { validateSessionPlanResponse } from "./validateSessionPlan";
import { rollingWeekDates } from "./planWindow";

const now = new Date("2026-08-08T12:00:00.000Z");
const dates = rollingWeekDates(now);

function restDay(order: number, scheduledDate: string) {
  return {
    order,
    scheduledDate,
    title: "Descanso",
    type: "rest",
    purpose: "Recuperação.",
    coachingNotes: ["Durma bem."],
    segments: [],
  };
}

function easyDay(order: number, scheduledDate: string) {
  return {
    order,
    scheduledDate,
    title: "Aeróbico leve",
    type: "easy",
    purpose: "Volume fácil.",
    totalDistanceKmMin: 6,
    totalDistanceKmMax: 6,
    coachingNotes: ["Conversacional."],
    segments: [
      { kind: "steady", distanceKm: 6, paceMinPerKm: 6.5, paceMaxPerKm: 7 },
    ],
  };
}

function tempoDay(order: number, scheduledDate: string) {
  return {
    order,
    scheduledDate,
    title: "Tempo controlado",
    type: "tempo",
    purpose: "Trabalho sustentado próximo do limiar.",
    totalDistanceKmMin: 8,
    totalDistanceKmMax: 8,
    coachingNotes: ["Controlado, não ritmo de prova."],
    segments: [
      { kind: "warmup", distanceKm: 1.5, notes: "fácil" },
      {
        kind: "work",
        repeat: 3,
        distanceKm: 1.5,
        paceMinPerKm: 5.92,
        paceMaxPerKm: 6.08,
      },
      { kind: "rest", durationMinutes: 2, notes: "trote fácil" },
      { kind: "cooldown", distanceKmMin: 1, distanceKmMax: 1.5 },
    ],
  };
}

function longRunDay(order: number, scheduledDate: string) {
  return {
    order,
    scheduledDate,
    title: "Longão fácil",
    type: "long_run",
    purpose: "Construir durabilidade.",
    totalDistanceKmMin: 12,
    totalDistanceKmMax: 12,
    coachingNotes: ["Sem finalização rápida."],
    segments: [
      { kind: "steady", distanceKm: 12, paceMinPerKm: 6.42, paceMaxPerKm: 6.92 },
    ],
  };
}

function buildWeekFixture() {
  return {
    rationale: "Semana com bom equilíbrio entre volume e recuperação.",
    sessions: [
      easyDay(1, dates[0]!),
      restDay(2, dates[1]!),
      tempoDay(3, dates[2]!),
      restDay(4, dates[3]!),
      easyDay(5, dates[4]!),
      restDay(6, dates[5]!),
      longRunDay(7, dates[6]!),
    ],
  };
}

function testAcceptsFullWeek() {
  const fixture = buildWeekFixture();
  const result = validateSessionPlanResponse(fixture, { now });
  assert.equal(result.sessions.length, 7);
  assert.equal(result.sessions[0]!.type, "easy");
  assert.equal(result.sessions[1]!.type, "rest");
  assert.equal(result.sessions[2]!.type, "tempo");
  assert.equal(result.sessions[6]!.scheduledDate, dates[6]);
  assert.equal(result.rationale?.includes("equilíbrio"), true);
}

function testRejectsWrongSessionCount() {
  const fixture = buildWeekFixture();
  assert.throws(
    () =>
      validateSessionPlanResponse(
        { sessions: fixture.sessions.slice(0, 6) },
        { now },
      ),
    /sessions must contain exactly 7 items/,
  );
}

function testRejectsMissingDateCoverage() {
  const fixture = buildWeekFixture();
  const brokenSessions = fixture.sessions.map((session, index) =>
    index === 6 ? { ...session, scheduledDate: "2026-08-20" } : session,
  );
  assert.throws(
    () =>
      validateSessionPlanResponse({ sessions: brokenSessions }, { now }),
    /sessions must cover each date in the rolling week/,
  );
}

function testRejectsRestWithSegments() {
  const fixture = buildWeekFixture();
  const brokenSessions = fixture.sessions.map((session, index) =>
    index === 1
      ? {
          ...session,
          segments: [{ kind: "steady", distanceKm: 3 }],
        }
      : session,
  );
  assert.throws(
    () =>
      validateSessionPlanResponse({ sessions: brokenSessions }, { now }),
    /sessions\[1\]\.segments must be empty for rest sessions/,
  );
}

function testRejectsRestWithDistance() {
  const fixture = buildWeekFixture();
  const brokenSessions = fixture.sessions.map((session, index) =>
    index === 1
      ? {
          ...session,
          totalDistanceKmMin: 3,
        }
      : session,
  );
  assert.throws(
    () =>
      validateSessionPlanResponse({ sessions: brokenSessions }, { now }),
    /sessions\[1\] must not set distance fields for rest sessions/,
  );
}

function testRejectsNonRestWithEmptySegments() {
  const fixture = buildWeekFixture();
  const brokenSessions = fixture.sessions.map((session, index) =>
    index === 0 ? { ...session, segments: [] } : session,
  );
  assert.throws(
    () =>
      validateSessionPlanResponse({ sessions: brokenSessions }, { now }),
    /sessions\[0\]\.segments must be a non-empty array/,
  );
}

function testRejectsInvalidType() {
  const fixture = buildWeekFixture();
  const brokenSessions = fixture.sessions.map((session, index) =>
    index === 0 ? { ...session, type: "race" } : session,
  );
  assert.throws(
    () =>
      validateSessionPlanResponse({ sessions: brokenSessions }, { now }),
    /SessionType/,
  );
}

function testRejectsBadOrders() {
  const fixture = buildWeekFixture();
  const brokenSessions = fixture.sessions.map((session, index) =>
    index === 6 ? { ...session, order: 6 } : session,
  );
  assert.throws(
    () =>
      validateSessionPlanResponse({ sessions: brokenSessions }, { now }),
    /sessions must have orders 1 through 7/,
  );
}

function testRejectsAllRestWeek() {
  const brokenSessions = dates.map((date, index) => restDay(index + 1, date));
  assert.throws(
    () => validateSessionPlanResponse({ sessions: brokenSessions }, { now }),
    /at least one non-rest/,
  );
}

function testRejectsNonChronologicalOrders() {
  const fixture = buildWeekFixture();
  // Orders 1..7 are all present, but order 1 is assigned to the last date.
  const brokenSessions = fixture.sessions.map((session, index) => {
    if (index === 0) return { ...session, order: 7 };
    if (index === 6) return { ...session, order: 1 };
    return session;
  });
  assert.throws(
    () =>
      validateSessionPlanResponse({ sessions: brokenSessions }, { now }),
    /chronological date order/,
  );
}

function testStripsNullOptionals() {
  const fixture = buildWeekFixture();
  const result = validateSessionPlanResponse(
    {
      rationale: null,
      sessions: fixture.sessions.map((session) => ({
        ...session,
        totalDistanceKmMin: null,
        segments: session.segments.map((segment) => ({
          ...segment,
          notes: null,
        })),
      })),
    },
    { now },
  );
  assert.equal(result.rationale, undefined);
  assert.equal(result.sessions[0]!.totalDistanceKmMin, undefined);
  assert.equal(result.sessions[2]!.segments[0]!.notes, undefined);
}

testAcceptsFullWeek();
testRejectsWrongSessionCount();
testRejectsMissingDateCoverage();
testRejectsRestWithSegments();
testRejectsRestWithDistance();
testRejectsNonRestWithEmptySegments();
testRejectsInvalidType();
testRejectsBadOrders();
testRejectsAllRestWeek();
testRejectsNonChronologicalOrders();
testStripsNullOptionals();

console.log("validateSessionPlan tests passed");
