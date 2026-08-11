import assert from "node:assert/strict";
import {
  formatContinuityForPrompt,
  type ContinuityContext,
} from "./formatContinuityForPrompt";

function sampleContext(): ContinuityContext {
  return {
    window: { startDate: "2026-08-11", endDate: "2026-08-17" },
    completedSessions: [
      {
        order: 1,
        title: "Corrida Leve",
        type: "easy",
        purpose: "recuperação",
        scheduledDate: "2026-08-11",
        coachingNotes: ["confortável"],
        segments: [
          { kind: "steady", distanceKm: 5, paceMinPerKm: 7.5 },
        ],
        activityId: "act1",
      },
    ],
    remainingSessions: [
      {
        order: 2,
        title: "Ritmo Forte 10k",
        type: "tempo",
        purpose: "limiar",
        scheduledDate: "2026-08-12",
        coachingNotes: ["aquecer bem", "ritmo constante"],
        segments: [
          { kind: "warmup", distanceKm: 1.5, paceMinPerKm: 7.5 },
          { kind: "work", distanceKm: 10, paceMinPerKm: 5.65 },
          { kind: "cooldown", distanceKm: 1, paceMinPerKm: 7.5 },
        ],
      },
      {
        order: 3,
        title: "Descanso",
        type: "rest",
        purpose: "recuperação",
        scheduledDate: "2026-08-13",
        coachingNotes: ["força"],
        segments: [],
      },
    ],
  };
}

function testLabeledContinuityBlocks() {
  const text = formatContinuityForPrompt(sampleContext());
  assert.match(text, /^PLAN_CONTINUITY\n/m);
  assert.match(text, /week=2026-08-11 → 2026-08-17/);
  assert.match(text, /^COMPLETED\n/m);
  assert.match(text, /^REMAINING\n/m);
  assert.doesNotMatch(text, /\{|"order":/);
}

function testSessionLinesIncludeTypeAndSegments() {
  const text = formatContinuityForPrompt(sampleContext());
  assert.match(text, /2026-08-11 type=easy title=Corrida Leve/);
  assert.match(text, /2026-08-12 type=tempo/);
  assert.match(text, /warmup 1\.5km @7\.5/);
  assert.match(text, /work 10km @5\.65/);
  assert.match(text, /2026-08-13 type=rest/);
}

function testEmptyCompletedSaysNone() {
  const ctx = sampleContext();
  ctx.completedSessions = [];
  const text = formatContinuityForPrompt(ctx);
  assert.match(text, /COMPLETED\nnone/);
}

testLabeledContinuityBlocks();
testSessionLinesIncludeTypeAndSegments();
testEmptyCompletedSaysNone();
console.log("formatContinuityForPrompt tests passed");
