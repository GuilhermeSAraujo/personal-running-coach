import assert from "node:assert/strict";
import { GOAL_DISTANCE_KM } from "@/lib/goal";
import type { SnapshotActivityInput } from "./types";
import { estimateEfforts } from "./efforts";

function run(
  partial: Partial<SnapshotActivityInput> & {
    startedAt: Date;
    distanceKm: number;
    durationSeconds: number;
  },
): SnapshotActivityInput {
  return {
    type: "run",
    paceSecondsPerKm: partial.durationSeconds / partial.distanceKm,
    elevationGainMeters: 0,
    ...partial,
  };
}

function testFivePointSevenKmQualifiesAs5k() {
  const activities = [
    run({
      startedAt: new Date("2026-06-01T10:00:00.000Z"),
      distanceKm: 5.7,
      durationSeconds: 5.7 * 300,
    }),
  ];
  const set = estimateEfforts(activities, [1, 3, 5, 10]);
  assert.ok(set["5k"]);
  assert.equal(set["5k"]!.nominalDistanceKm, 5);
  assert.equal(set["5k"]!.actualDistanceKm, 5.7);
  assert.equal(set["5k"]!.paceSecondsPerKm, 300);
  assert.equal(set["5k"]!.estimatedTimeSeconds, 1500);
}

function testFivePointEightKmDoesNotQualifyAs5k() {
  const activities = [
    run({
      startedAt: new Date("2026-06-01T10:00:00.000Z"),
      distanceKm: 5.8,
      durationSeconds: 5.8 * 300,
    }),
  ];
  const set = estimateEfforts(activities, [5]);
  assert.equal(set["5k"], undefined);
}

function testFourPointNineKmDoesNotQualifyAs5k() {
  const activities = [
    run({
      startedAt: new Date("2026-06-01T10:00:00.000Z"),
      distanceKm: 4.9,
      durationSeconds: 4.9 * 300,
    }),
  ];
  const set = estimateEfforts(activities, [5]);
  assert.equal(set["5k"], undefined);
}

function testFastestCandidateWins() {
  const activities = [
    run({
      startedAt: new Date("2026-06-01T10:00:00.000Z"),
      distanceKm: 5.1,
      durationSeconds: 5.1 * 360,
    }),
    run({
      startedAt: new Date("2026-06-02T10:00:00.000Z"),
      distanceKm: 5.2,
      durationSeconds: 5.2 * 300,
      heartRate: { average: 160 },
    }),
  ];
  const set = estimateEfforts(activities, [5]);
  assert.equal(set["5k"]!.paceSecondsPerKm, 300);
  assert.equal(set["5k"]!.averageHeartRate, 160);
  assert.equal(
    set["5k"]!.date.toISOString(),
    "2026-06-02T10:00:00.000Z",
  );
}

function testMissingKeysWhenNothingQualifies() {
  const activities = [
    run({
      startedAt: new Date("2026-06-01T10:00:00.000Z"),
      distanceKm: 12,
      durationSeconds: 3600,
    }),
  ];
  const set = estimateEfforts(activities, [1, 3, 5, 10]);
  assert.deepEqual(set, {});
}

function testWalksNeverQualify() {
  const activities: SnapshotActivityInput[] = [
    {
      type: "walk",
      startedAt: new Date("2026-06-01T10:00:00.000Z"),
      distanceKm: 5.1,
      durationSeconds: 5.1 * 500,
      paceSecondsPerKm: 500,
      elevationGainMeters: 0,
    },
  ];
  const set = estimateEfforts(activities, [5]);
  assert.equal(set["5k"], undefined);
}

function testHalfMarathonKey() {
  const activities = [
    run({
      startedAt: new Date("2026-06-01T10:00:00.000Z"),
      distanceKm: 21.5,
      durationSeconds: 21.5 * 330,
    }),
  ];
  const set = estimateEfforts(activities, [GOAL_DISTANCE_KM.half_marathon]);
  assert.ok(set.halfMarathon);
  assert.equal(
    set.halfMarathon!.nominalDistanceKm,
    GOAL_DISTANCE_KM.half_marathon,
  );
}

function testMarathonKey() {
  const activities = [
    run({
      startedAt: new Date("2026-06-01T10:00:00.000Z"),
      distanceKm: 42.5,
      durationSeconds: 42.5 * 330,
    }),
  ];
  const set = estimateEfforts(activities, [GOAL_DISTANCE_KM.marathon]);
  assert.ok(set.marathon);
  assert.equal(set.marathon!.nominalDistanceKm, GOAL_DISTANCE_KM.marathon);
  assert.equal(
    set.marathon!.estimatedTimeSeconds,
    330 * GOAL_DISTANCE_KM.marathon,
  );
}

function testMarathonDoesNotQualifyWhenTooShort() {
  const activities = [
    run({
      startedAt: new Date("2026-06-01T10:00:00.000Z"),
      distanceKm: 40,
      durationSeconds: 40 * 330,
    }),
  ];
  const set = estimateEfforts(activities, [GOAL_DISTANCE_KM.marathon]);
  assert.equal(set.marathon, undefined);
}

testFivePointSevenKmQualifiesAs5k();
testFivePointEightKmDoesNotQualifyAs5k();
testFourPointNineKmDoesNotQualifyAs5k();
testFastestCandidateWins();
testMissingKeysWhenNothingQualifies();
testWalksNeverQualify();
testHalfMarathonKey();
testMarathonKey();
testMarathonDoesNotQualifyWhenTooShort();

console.log("efforts tests passed");
