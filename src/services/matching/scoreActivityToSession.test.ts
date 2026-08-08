import assert from "node:assert/strict";
import { scoreActivityToSession } from "./scoreActivityToSession";
import { suggestMatches } from "./suggestMatches";
import type { ActivityForMatch, SessionForMatch } from "./types";

function activity(
  overrides: Partial<ActivityForMatch> & Pick<ActivityForMatch, "id">,
): ActivityForMatch {
  return {
    startedAt: new Date("2026-08-01T08:00:00Z"),
    distanceKm: 6,
    durationSeconds: 2400,
    paceSecondsPerKm: 400,
    ...overrides,
  };
}

function session(
  overrides: Partial<SessionForMatch> & Pick<SessionForMatch, "order" | "type">,
): SessionForMatch {
  return {
    title: `Session ${overrides.order}`,
    totalDistanceKmMin: 5,
    totalDistanceKmMax: 7,
    segments: [{ kind: "steady", distanceKm: 6 }],
    ...overrides,
  };
}

{
  const easy = session({ order: 1, type: "easy" });
  const result = scoreActivityToSession(
    activity({
      id: "a1",
      distanceKm: 6,
      paceSecondsPerKm: 420,
    }),
    easy,
    0,
  );
  assert.ok(result.score >= 0.7, `expected high score, got ${result.score}`);
  assert.ok(result.reasons.includes("fits session order"));
  assert.ok(result.reasons.includes("distance in range"));
}

{
  const tempo = session({
    order: 2,
    type: "tempo",
    totalDistanceKmMin: 8,
    totalDistanceKmMax: 10,
  });
  const result = scoreActivityToSession(
    activity({
      id: "a1",
      distanceKm: 3,
      paceSecondsPerKm: 420,
    }),
    tempo,
    0,
  );
  assert.ok(result.score < 0.55, `expected low score, got ${result.score}`);
}

{
  const activities: ActivityForMatch[] = [
    activity({
      id: "early",
      startedAt: new Date("2026-08-01T07:00:00Z"),
      distanceKm: 6,
      paceSecondsPerKm: 420,
    }),
    activity({
      id: "late",
      startedAt: new Date("2026-08-02T07:00:00Z"),
      distanceKm: 12,
      durationSeconds: 4200,
      paceSecondsPerKm: 350,
    }),
  ];
  const sessions: SessionForMatch[] = [
    session({ order: 1, type: "easy" }),
    session({
      order: 2,
      type: "long_run",
      totalDistanceKmMin: 11,
      totalDistanceKmMax: 14,
      segments: [{ kind: "steady", distanceKm: 12 }],
    }),
    session({
      order: 3,
      type: "tempo",
      totalDistanceKmMin: 7,
      totalDistanceKmMax: 8,
    }),
  ];

  const suggestions = suggestMatches(activities, sessions);
  assert.equal(suggestions.length, 2);

  const byActivity = Object.fromEntries(
    suggestions.map((s) => [s.activityId, s.sessionOrder]),
  );
  assert.equal(byActivity.early, 1);
  assert.equal(byActivity.late, 2);

  const usedSessions = new Set(suggestions.map((s) => s.sessionOrder));
  assert.equal(usedSessions.size, suggestions.length);
}

{
  const suggestions = suggestMatches(
    [
      activity({
        id: "far",
        distanceKm: 1,
        paceSecondsPerKm: 600,
      }),
    ],
    [
      session({
        order: 2,
        type: "interval",
        totalDistanceKmMin: 10,
        totalDistanceKmMax: 12,
      }),
    ],
  );
  assert.equal(suggestions.length, 0);
}

console.log("matching tests passed");
