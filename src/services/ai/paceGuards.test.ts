import assert from "node:assert/strict";
import {
  assertSessionsRespectPaceGuards,
  derivePaceGuardrails,
  formatPaceGuardsForPrompt,
  secondsPerKmToMinPerKm,
} from "./paceGuards";
import type { AiPlannedSession } from "./types";

function testSecondsToMinPerKm() {
  assert.equal(secondsPerKmToMinPerKm(345), 5.75); // 5:45
  assert.equal(secondsPerKmToMinPerKm(510), 8.5); // 8:30
}

function testDerivesGuardsFrom5kAndRecentEasy() {
  const guards = derivePaceGuardrails({
    recentTraining: {
      bestEfforts: {
        "5k": {
          paceSecondsPerKm: 345, // 5:45
        },
      },
      recentActivities: [
        { paceSecondsPerKm: 500 },
        { paceSecondsPerKm: 510 },
        { paceSecondsPerKm: 520 },
        { paceSecondsPerKm: 345 }, // hard effort — excluded from easy pool
      ],
    },
  });

  assert.ok(guards);
  // work floor ≈ 5k * 0.98 → cannot invent 4:45 work
  assert.ok(guards!.workFloorMinPerKm > 5.5);
  assert.ok(guards!.workFloorMinPerKm < 5.8);
  // easy floor near observed easy (~8:30), and well slower than 5k
  assert.ok(guards!.easyFloorMinPerKm >= 7.5);
  assert.ok(guards!.easyFloorMinPerKm <= 8.6);
}

function testRejectsEasyFasterThanGuard() {
  const guards = derivePaceGuardrails({
    recentTraining: {
      bestEfforts: { "5k": { paceSecondsPerKm: 345 } },
      recentActivities: [
        { paceSecondsPerKm: 510 },
        { paceSecondsPerKm: 520 },
        { paceSecondsPerKm: 500 },
      ],
    },
  });
  assert.ok(guards);

  const easyTooFast: AiPlannedSession = {
    order: 1,
    scheduledDate: "2026-08-08",
    title: "Easy",
    type: "easy",
    purpose: "volume",
    coachingNotes: [],
    segments: [
      { kind: "steady", distanceKm: 6, paceMinPerKm: 4.75, paceMaxPerKm: 5.0 },
    ],
  };

  assert.throws(
    () => assertSessionsRespectPaceGuards([easyTooFast], guards!),
    /easy|recovery|long_run|pace/i,
  );
}

function testRejectsWorkFasterThan5k() {
  const guards = derivePaceGuardrails({
    recentTraining: {
      bestEfforts: { "5k": { paceSecondsPerKm: 345 } },
      recentActivities: [{ paceSecondsPerKm: 510 }],
    },
  });
  assert.ok(guards);

  const intervalTooFast: AiPlannedSession = {
    order: 1,
    scheduledDate: "2026-08-08",
    title: "Intervals",
    type: "interval",
    purpose: "speed",
    coachingNotes: [],
    segments: [
      { kind: "warmup", distanceKm: 1 },
      { kind: "work", distanceKm: 1, paceMinPerKm: 4.45, paceMaxPerKm: 4.5 },
      { kind: "cooldown", distanceKm: 1 },
    ],
  };

  assert.throws(
    () => assertSessionsRespectPaceGuards([intervalTooFast], guards!),
    /work|pace/i,
  );
}

function testAcceptsRealisticEasyAndTempo() {
  const guards = derivePaceGuardrails({
    recentTraining: {
      bestEfforts: { "5k": { paceSecondsPerKm: 345 } },
      recentActivities: [
        { paceSecondsPerKm: 510 },
        { paceSecondsPerKm: 520 },
        { paceSecondsPerKm: 500 },
      ],
    },
  });
  assert.ok(guards);

  const sessions: AiPlannedSession[] = [
    {
      order: 1,
      scheduledDate: "2026-08-08",
      title: "Easy",
      type: "easy",
      purpose: "volume",
      coachingNotes: [],
      segments: [
        { kind: "steady", distanceKm: 6, paceMinPerKm: 8.3, paceMaxPerKm: 8.7 },
      ],
    },
    {
      order: 2,
      scheduledDate: "2026-08-09",
      title: "Tempo",
      type: "tempo",
      purpose: "threshold",
      coachingNotes: [],
      segments: [
        {
          kind: "work",
          distanceKm: 3,
          paceMinPerKm: 5.9,
          paceMaxPerKm: 6.1,
        },
      ],
    },
  ];

  assert.doesNotThrow(() =>
    assertSessionsRespectPaceGuards(sessions, guards!),
  );
}

function testPromptBlockIncludesNumbers() {
  const guards = derivePaceGuardrails({
    recentTraining: {
      bestEfforts: { "5k": { paceSecondsPerKm: 345 } },
      recentActivities: [{ paceSecondsPerKm: 510 }, { paceSecondsPerKm: 520 }],
    },
  });
  assert.ok(guards);
  const text = formatPaceGuardsForPrompt(guards!);
  assert.match(text, /min\/km/);
  assert.match(text, /easy/i);
  assert.ok(text.includes(String(guards!.easyFloorMinPerKm)));
  assert.ok(text.includes(String(guards!.workFloorMinPerKm)));
}

function testNoGuardsWithoutPaceEvidence() {
  assert.equal(
    derivePaceGuardrails({ recentTraining: { bestEfforts: {}, recentActivities: [] } }),
    null,
  );
}

testSecondsToMinPerKm();
testDerivesGuardsFrom5kAndRecentEasy();
testRejectsEasyFasterThanGuard();
testRejectsWorkFasterThan5k();
testAcceptsRealisticEasyAndTempo();
testPromptBlockIncludesNumbers();
testNoGuardsWithoutPaceEvidence();
console.log("paceGuards tests passed");
