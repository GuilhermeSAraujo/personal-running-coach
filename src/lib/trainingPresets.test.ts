import assert from "node:assert/strict";
import { GOAL_TYPES } from "@/lib/goal";
import {
  assertAllGoalsHavePresets,
  getTrainingPreset,
  resolveTrainingPresetForSnapshot,
  TRAINING_PRESETS,
} from "@/lib/trainingPresets";
import { isTrainingStyle, TRAINING_STYLES } from "@/lib/trainingStyle";

function testAllGoalTypesHavePresets() {
  assertAllGoalsHavePresets();
  for (const type of GOAL_TYPES) {
    const preset = getTrainingPreset(type);
    assert.equal(preset.goalType, type);
    assert.ok(preset.id);
    assert.ok(preset.name);
    assert.ok(preset.summary);
    assert.ok(preset.philosophy);
    assert.ok(preset.rules.length > 0);
    for (const day of [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ] as const) {
      assert.ok(preset.weekTemplate[day]);
    }
  }
  assert.equal(Object.keys(TRAINING_PRESETS).length, GOAL_TYPES.length);
}

function testHalfMarathonTimeLongRules() {
  const half = getTrainingPreset("half_marathon");
  assert.equal(half.id, "half_marathon_time_long");
  assert.equal(half.weekTemplate.sunday, "long_run");
  assert.equal(half.weekTemplate.tuesday, "strength_or_rest");
  assert.equal(half.weekTemplate.thursday, "strength_or_rest");
  assert.ok(half.rules.some((r) => /60 minutes/i.test(r)));
  assert.ok(half.rules.some((r) => /10 minutes/i.test(r)));
}

function testResolveCloneIsIndependent() {
  const a = resolveTrainingPresetForSnapshot("5k");
  const b = resolveTrainingPresetForSnapshot("5k");
  a.rules.push("mutated");
  assert.equal(b.rules.includes("mutated"), false);
  assert.equal(getTrainingPreset("5k").rules.includes("mutated"), false);
}

function testTrainingStyleGuard() {
  assert.deepEqual([...TRAINING_STYLES], ["preset", "adaptive"]);
  assert.equal(isTrainingStyle("preset"), true);
  assert.equal(isTrainingStyle("adaptive"), true);
  assert.equal(isTrainingStyle("other"), false);
  assert.equal(isTrainingStyle(null), false);
}

testAllGoalTypesHavePresets();
testHalfMarathonTimeLongRules();
testResolveCloneIsIndependent();
testTrainingStyleGuard();

console.log("trainingPresets tests passed");
