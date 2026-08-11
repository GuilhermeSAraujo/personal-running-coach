import assert from "node:assert/strict";
import { assembleNextSessionsUserText } from "./generateNextSessions";
import type { ContinuityContext } from "./buildContinuityContext";

function testAssemblesWindowPromptAndContinuityWithoutJsonDump() {
  const continuity: ContinuityContext = {
    window: { startDate: "2026-08-11", endDate: "2026-08-17" },
    completedSessions: [],
    remainingSessions: [
      {
        order: 1,
        title: "Easy",
        type: "easy",
        purpose: "recovery",
        scheduledDate: "2026-08-12",
        coachingNotes: [],
        segments: [{ kind: "steady", distanceKm: 6, paceMinPerKm: 7.5 }],
      },
    ],
  };

  const promptText = [
    "ATHLETE",
    "age=24",
    "",
    "TRAINING_PRESET",
    "id=half_marathon_time_long",
    "sun=long_run",
  ].join("\n");

  const text = assembleNextSessionsUserText({
    window: { startDate: "2026-08-11", endDate: "2026-08-17" },
    promptText,
    continuity,
  });

  assert.match(text, /Janela do plano \(UTC\): 2026-08-11 … 2026-08-17/);
  assert.match(text, /ATHLETE\nage=24/);
  assert.match(text, /PLAN_CONTINUITY/);
  assert.match(text, /TRAINING_PRESET/);
  assert.doesNotMatch(text, /Snapshot do atleta \(JSON\)/);
  assert.doesNotMatch(text, /Estilo de treino \/ Preset \(JSON\)/);
  assert.doesNotMatch(text, /Continuidade do plano anterior \(JSON\)/);
  assert.equal((text.match(/TRAINING_PRESET/g) ?? []).length, 1);
}

function testOmitsContinuityWhenNull() {
  const text = assembleNextSessionsUserText({
    window: { startDate: "2026-08-11", endDate: "2026-08-17" },
    promptText: "ATHLETE\nage=24",
    continuity: null,
  });
  assert.doesNotMatch(text, /PLAN_CONTINUITY/);
  assert.match(text, /ATHLETE\nage=24/);
}

testAssemblesWindowPromptAndContinuityWithoutJsonDump();
testOmitsContinuityWhenNull();
console.log("assembleNextSessionsUserText tests passed");
