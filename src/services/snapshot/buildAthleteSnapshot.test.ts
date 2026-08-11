import assert from "node:assert/strict";
import { buildAthleteSnapshot } from "./buildAthleteSnapshot";
import type { SnapshotActivityInput, SnapshotUser } from "./types";

function run(
  partial: Partial<SnapshotActivityInput> & {
    startedAt: Date;
    distanceKm: number;
  },
): SnapshotActivityInput {
  const durationSeconds =
    partial.durationSeconds ?? partial.distanceKm * 360;
  return {
    type: "run",
    durationSeconds,
    paceSecondsPerKm: durationSeconds / partial.distanceKm,
    elevationGainMeters: 0,
    ...partial,
  };
}

function testEmptyAthleteProducesZeroFilledSnapshot() {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const snapshot = buildAthleteSnapshot({
    user: {},
    activities: [],
    now,
  });

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.recentTraining.weeks.length, 12);
  assert.equal(snapshot.profile.lifetimeRunCount, 0);
  assert.equal(snapshot.historicalPerformance.lifetimeRuns, 0);
  assert.equal(snapshot.historicalPerformance.lifetimeDistanceKm, 0);
  assert.deepEqual(snapshot.recentTraining.bestEfforts, {});
  assert.deepEqual(snapshot.historicalPerformance.personalBests, {});
  assert.equal(snapshot.recentTraining.recentActivities.length, 0);
  assert.equal("goal" in snapshot, false);
  assert.equal(snapshot.trainingStyle, "adaptive");
  assert.equal("trainingPreset" in snapshot, false);
  assert.equal("ageYears" in snapshot.profile, false);
  assert.equal(snapshot.currentState.weeklyVolumeKm.average12w, 0);
  assert.equal(snapshot.currentState.trends.volume, "stable");
}

function testMissingGoalOmitsGoalKey() {
  const snapshot = buildAthleteSnapshot({
    user: { heightCm: 178, weightKg: 70 },
    activities: [],
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.equal("goal" in snapshot, false);
  assert.equal(snapshot.profile.heightCm, 178);
  assert.equal(snapshot.profile.weightKg, 70);
}

function testAgeYearsComputedFromBirthDate() {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const snapshot = buildAthleteSnapshot({
    user: { birthDate: new Date("2000-03-15T00:00:00.000Z") },
    activities: [],
    now,
  });
  assert.equal(snapshot.profile.ageYears, 26);
}

function testAgeYearsBeforeBirthdayThisYear() {
  const now = new Date("2026-02-01T12:00:00.000Z");
  const snapshot = buildAthleteSnapshot({
    user: { birthDate: new Date("2000-03-15T00:00:00.000Z") },
    activities: [],
    now,
  });
  assert.equal(snapshot.profile.ageYears, 25);
}

function testGoalAndRecentTraining() {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const user: SnapshotUser = {
    birthDate: new Date("1995-01-01T00:00:00.000Z"),
    goal: {
      type: "half_marathon",
      distanceKm: 21.1,
      targetTimeSeconds: 6300,
      targetDate: new Date("2026-11-15T00:00:00.000Z"),
    },
  };
  const activities = [
    run({
      startedAt: new Date("2026-06-24T10:00:00.000Z"),
      distanceKm: 10,
    }),
    run({
      startedAt: new Date("2026-06-30T10:00:00.000Z"),
      distanceKm: 5.1,
      durationSeconds: 5.1 * 300,
    }),
  ];

  const snapshot = buildAthleteSnapshot({ user, activities, now });
  assert.ok(snapshot.goal);
  assert.equal(snapshot.goal!.type, "half_marathon");
  assert.ok(snapshot.goal!.weeksUntilTarget > 0);
  assert.equal(snapshot.profile.lifetimeRunCount, 2);
  assert.equal(snapshot.recentTraining.recentActivities.length, 2);
  assert.equal(
    snapshot.recentTraining.recentActivities[0].date.toISOString(),
    "2026-06-30T10:00:00.000Z",
  );
  assert.ok(snapshot.recentTraining.bestEfforts["5k"]);
  assert.equal(snapshot.recentTraining.weeks[11].distanceKm, 10);
  assert.equal(snapshot.currentState.weeklyVolumeKm.currentWeek, 5.1);
}

function testRecentActivityIncludesAthleteFeedbackWhenPresent() {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const activities = [
    run({
      startedAt: new Date("2026-06-30T10:00:00.000Z"),
      distanceKm: 8,
      athleteFeedback: {
        effort: "too_hard",
        notes: "Legs heavy after km 5",
      },
    }),
    run({
      startedAt: new Date("2026-06-28T10:00:00.000Z"),
      distanceKm: 5,
    }),
  ];
  const snapshot = buildAthleteSnapshot({ user: {}, activities, now });
  assert.deepEqual(snapshot.recentTraining.recentActivities[0].athleteFeedback, {
    effort: "too_hard",
    notes: "Legs heavy after km 5",
  });
  assert.equal(
    "athleteFeedback" in snapshot.recentTraining.recentActivities[1],
    false,
  );
}

function testLegacyMissingTrainingStyleDefaultsAdaptive() {
  const snapshot = buildAthleteSnapshot({
    user: {
      goal: {
        type: "10k",
        distanceKm: 10,
        targetTimeSeconds: 3600,
        targetDate: new Date("2026-11-01T00:00:00.000Z"),
      },
    },
    activities: [],
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.equal(snapshot.trainingStyle, "adaptive");
  assert.equal("trainingPreset" in snapshot, false);
}

function testPresetEmbedsCatalogForGoal() {
  const snapshot = buildAthleteSnapshot({
    user: {
      trainingStyle: "preset",
      goal: {
        type: "half_marathon",
        distanceKm: 21.1,
        targetTimeSeconds: 8100,
        targetDate: new Date("2026-11-15T00:00:00.000Z"),
      },
    },
    activities: [],
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.equal(snapshot.trainingStyle, "preset");
  assert.ok(snapshot.trainingPreset);
  assert.equal(snapshot.trainingPreset!.id, "half_marathon_time_long");
  assert.equal(snapshot.trainingPreset!.goalType, "half_marathon");
  assert.equal(snapshot.trainingPreset!.weekTemplate.sunday, "long_run");
}

function testAdaptiveOmitsTrainingPreset() {
  const snapshot = buildAthleteSnapshot({
    user: {
      trainingStyle: "adaptive",
      goal: {
        type: "5k",
        distanceKm: 5,
        targetTimeSeconds: 1800,
        targetDate: new Date("2026-10-01T00:00:00.000Z"),
      },
    },
    activities: [],
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.equal(snapshot.trainingStyle, "adaptive");
  assert.equal("trainingPreset" in snapshot, false);
}

function testPresetWithoutGoalOmitsTrainingPreset() {
  const snapshot = buildAthleteSnapshot({
    user: { trainingStyle: "preset" },
    activities: [],
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.equal(snapshot.trainingStyle, "preset");
  assert.equal("trainingPreset" in snapshot, false);
}

testEmptyAthleteProducesZeroFilledSnapshot();
testMissingGoalOmitsGoalKey();
testAgeYearsComputedFromBirthDate();
testAgeYearsBeforeBirthdayThisYear();
testGoalAndRecentTraining();
testRecentActivityIncludesAthleteFeedbackWhenPresent();
testLegacyMissingTrainingStyleDefaultsAdaptive();
testPresetEmbedsCatalogForGoal();
testAdaptiveOmitsTrainingPreset();
testPresetWithoutGoalOmitsTrainingPreset();

console.log("buildAthleteSnapshot tests passed");
