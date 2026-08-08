import assert from "node:assert/strict";
import { buildContinuityContext } from "./buildContinuityContext";

const now = new Date("2026-08-08T12:00:00.000Z");

function testSplitsMatchedAndOpen() {
  const ctx = buildContinuityContext(
    {
      sessions: [
        {
          order: 1,
          title: "Easy",
          type: "easy",
          purpose: "aerobic",
          scheduledDate: "2026-08-05",
          coachingNotes: ["easy"],
          segments: [{ kind: "steady", distanceKm: 6 }],
          status: "matched",
          activityId: "act1",
        },
        {
          order: 2,
          title: "Rest",
          type: "rest",
          purpose: "recover",
          scheduledDate: "2026-08-09",
          coachingNotes: ["sleep"],
          segments: [],
          status: "open",
        },
        {
          order: 3,
          title: "Tempo",
          type: "tempo",
          purpose: "threshold",
          scheduledDate: "2026-08-10",
          coachingNotes: ["controlled"],
          segments: [{ kind: "work", distanceKm: 5 }],
          status: "open",
        },
      ],
    },
    now,
  );

  assert.deepEqual(ctx.window, {
    startDate: "2026-08-08",
    endDate: "2026-08-14",
  });
  assert.equal(ctx.completedSessions.length, 1);
  assert.equal(ctx.completedSessions[0]!.title, "Easy");
  assert.equal(ctx.completedSessions[0]!.activityId, "act1");
  assert.equal(ctx.remainingSessions.length, 2);
  assert.equal(ctx.remainingSessions[0]!.type, "rest");
  assert.equal(ctx.remainingSessions[1]!.type, "tempo");
}

testSplitsMatchedAndOpen();
console.log("buildContinuityContext tests passed");
