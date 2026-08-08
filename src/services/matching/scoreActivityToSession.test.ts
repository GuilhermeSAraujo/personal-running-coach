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
    1,
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

// A lone activity always sits at dense rank 0, so a single candidate
// session always gets full order credit — that alone clears the
// threshold. Exclusivity (not raw score) is what should keep a poorly
// fitting activity from stealing the only open session away from a
// clearly better-fitting one.
{
  const suggestions = suggestMatches(
    [
      activity({
        id: "good",
        startedAt: new Date("2026-08-01T07:00:00Z"),
        distanceKm: 11,
        durationSeconds: 4000,
        paceSecondsPerKm: 340,
      }),
      activity({
        id: "far",
        startedAt: new Date("2026-08-02T07:00:00Z"),
        distanceKm: 1,
        paceSecondsPerKm: 600,
      }),
    ],
    [
      session({
        order: 2,
        type: "long_run",
        totalDistanceKmMin: 10,
        totalDistanceKmMax: 12,
        segments: [{ kind: "steady", distanceKm: 11 }],
      }),
    ],
  );
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]!.activityId, "good");
}

// Regression: rest days create gaps in session.order (1,3,5,7 instead of
// 1,2,3,4). Order scoring must rank by position among the passed-in
// (non-rest) sessions, not by the raw order field, or activities get
// mismatched against the wrong day.
{
  const activities: ActivityForMatch[] = [
    activity({
      id: "day1",
      startedAt: new Date("2026-08-01T07:00:00Z"),
      distanceKm: 6,
      paceSecondsPerKm: 420,
    }),
    activity({
      id: "day3",
      startedAt: new Date("2026-08-03T07:00:00Z"),
      distanceKm: 12,
      durationSeconds: 4200,
      paceSecondsPerKm: 350,
    }),
    activity({
      id: "day5",
      startedAt: new Date("2026-08-05T07:00:00Z"),
      distanceKm: 3,
      durationSeconds: 1200,
      paceSecondsPerKm: 420,
    }),
    activity({
      id: "day7",
      startedAt: new Date("2026-08-07T07:00:00Z"),
      distanceKm: 8,
      durationSeconds: 2800,
      paceSecondsPerKm: 400,
    }),
  ];
  const sessions: SessionForMatch[] = [
    session({ order: 1, type: "easy" }),
    session({
      order: 3,
      type: "long_run",
      totalDistanceKmMin: 11,
      totalDistanceKmMax: 14,
      segments: [{ kind: "steady", distanceKm: 12 }],
    }),
    session({
      order: 5,
      type: "recovery",
      totalDistanceKmMin: 2,
      totalDistanceKmMax: 4,
      segments: [{ kind: "steady", distanceKm: 3 }],
    }),
    session({
      order: 7,
      type: "tempo",
      totalDistanceKmMin: 7,
      totalDistanceKmMax: 9,
      segments: [{ kind: "steady", distanceKm: 8 }],
    }),
  ];

  const suggestions = suggestMatches(activities, sessions);
  assert.equal(suggestions.length, 4);

  const byActivity = Object.fromEntries(
    suggestions.map((s) => [s.activityId, s.sessionOrder]),
  );
  assert.equal(byActivity.day1, 1);
  assert.equal(byActivity.day3, 3);
  assert.equal(byActivity.day5, 5);
  assert.equal(byActivity.day7, 7);
}

console.log("matching tests passed");
