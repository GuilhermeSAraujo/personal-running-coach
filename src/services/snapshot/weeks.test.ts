import assert from "node:assert/strict";
import type { SnapshotActivityInput } from "./types";
import {
  bucketCompletedWeeks,
  currentWeekDistanceKm,
  startOfWeekMondayUtc,
} from "./weeks";

function run(partial: Partial<SnapshotActivityInput> & { startedAt: Date }): SnapshotActivityInput {
  return {
    type: "run",
    distanceKm: 5,
    durationSeconds: 1800,
    paceSecondsPerKm: 360,
    elevationGainMeters: 0,
    ...partial,
  };
}

function walk(partial: Partial<SnapshotActivityInput> & { startedAt: Date }): SnapshotActivityInput {
  return {
    type: "walk",
    distanceKm: 3,
    durationSeconds: 2400,
    paceSecondsPerKm: 800,
    elevationGainMeters: 0,
    ...partial,
  };
}

function testMondayUtcNormalisation() {
  // Thursday 2026-04-09 → Monday 2026-04-06
  const thursday = new Date("2026-04-09T15:30:00.000Z");
  const monday = startOfWeekMondayUtc(thursday);
  assert.equal(monday.toISOString(), "2026-04-06T00:00:00.000Z");
}

function testMondayStaysMonday() {
  const monday = new Date("2026-04-06T00:00:00.000Z");
  assert.equal(
    startOfWeekMondayUtc(monday).toISOString(),
    "2026-04-06T00:00:00.000Z",
  );
}

function testSundayMapsToPreviousMonday() {
  // Sunday 2026-04-12 → Monday 2026-04-06
  const sunday = new Date("2026-04-12T23:59:59.000Z");
  assert.equal(
    startOfWeekMondayUtc(sunday).toISOString(),
    "2026-04-06T00:00:00.000Z",
  );
}

function testExactly12CompletedWeeksExcludingCurrent() {
  // now = Wednesday 2026-07-01 → current week starts 2026-06-29
  const now = new Date("2026-07-01T12:00:00.000Z");
  const { weeks, windowStart, windowEnd } = bucketCompletedWeeks([], now);

  assert.equal(weeks.length, 12);
  assert.equal(windowEnd.toISOString(), "2026-06-29T00:00:00.000Z");
  assert.equal(windowStart.toISOString(), "2026-04-06T00:00:00.000Z");
  assert.equal(weeks[0].weekStart.toISOString(), windowStart.toISOString());
  assert.equal(weeks[11].weekStart.toISOString(), "2026-06-22T00:00:00.000Z");
}

function testEmptyWeeksZeroFilled() {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const { weeks } = bucketCompletedWeeks([], now);
  for (const week of weeks) {
    assert.equal(week.runs, 0);
    assert.equal(week.distanceKm, 0);
    assert.equal(week.durationSeconds, 0);
    assert.equal(week.longestRunKm, 0);
    assert.equal(week.elevationGainMeters, 0);
    assert.equal(week.activitiesWithHeartRate, 0);
    assert.equal(week.walkCount, 0);
    assert.equal(week.walkDistanceKm, 0);
    assert.equal("averagePaceSecondsPerKm" in week, false);
    assert.equal("averageHeartRate" in week, false);
    assert.equal("totalSufferScore" in week, false);
  }
}

function testInProgressWeekExcludedFromWeeks() {
  const now = new Date("2026-07-01T12:00:00.000Z"); // Wed; current week Mon 06-29
  const activities = [
    run({ startedAt: new Date("2026-06-30T10:00:00.000Z"), distanceKm: 10 }), // current week
    run({ startedAt: new Date("2026-06-24T10:00:00.000Z"), distanceKm: 8 }), // last completed week
  ];
  const { weeks } = bucketCompletedWeeks(activities, now);
  assert.equal(weeks[11].distanceKm, 8);
  assert.equal(weeks[11].runs, 1);
  // current-week run must not appear in any completed week
  assert.ok(weeks.every((w) => w.distanceKm !== 10 || w.weekStart.toISOString() !== "2026-06-29T00:00:00.000Z"));
  assert.ok(!weeks.some((w) => w.weekStart.toISOString() === "2026-06-29T00:00:00.000Z"));
}

function testCurrentWeekDistance() {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const windowEnd = new Date("2026-06-29T00:00:00.000Z");
  const activities = [
    run({ startedAt: new Date("2026-06-30T10:00:00.000Z"), distanceKm: 7 }),
    run({ startedAt: new Date("2026-06-24T10:00:00.000Z"), distanceKm: 8 }),
    walk({ startedAt: new Date("2026-06-30T18:00:00.000Z"), distanceKm: 2 }),
  ];
  assert.equal(currentWeekDistanceKm(activities, windowEnd, now), 7);
}

function testMondayBoundaryActivityLandsInCorrectWeek() {
  const now = new Date("2026-07-01T12:00:00.000Z");
  // Monday 2026-06-22 00:00 UTC is start of last completed week
  const activities = [
    run({ startedAt: new Date("2026-06-22T00:00:00.000Z"), distanceKm: 6 }),
  ];
  const { weeks } = bucketCompletedWeeks(activities, now);
  assert.equal(weeks[11].runs, 1);
  assert.equal(weeks[11].distanceKm, 6);
}

function testDistanceWeightedPace() {
  const now = new Date("2026-07-01T12:00:00.000Z");
  // Two runs in week starting 2026-06-22:
  // 2km @ 300s/km (duration 600), 8km @ 400s/km (duration 3200)
  // distance-weighted = 3800/10 = 380
  // naive mean of paces = (300+400)/2 = 350
  const activities = [
    run({
      startedAt: new Date("2026-06-23T10:00:00.000Z"),
      distanceKm: 2,
      durationSeconds: 600,
      paceSecondsPerKm: 300,
    }),
    run({
      startedAt: new Date("2026-06-24T10:00:00.000Z"),
      distanceKm: 8,
      durationSeconds: 3200,
      paceSecondsPerKm: 400,
    }),
  ];
  const { weeks } = bucketCompletedWeeks(activities, now);
  assert.equal(weeks[11].averagePaceSecondsPerKm, 380);
  assert.notEqual(weeks[11].averagePaceSecondsPerKm, 350);
}

function testDurationWeightedHrIgnoresRunsWithoutHr() {
  const now = new Date("2026-07-01T12:00:00.000Z");
  // HR run: 150 for 1000s; no-HR run: 2000s — weighted should be 150
  const activities = [
    run({
      startedAt: new Date("2026-06-23T10:00:00.000Z"),
      durationSeconds: 1000,
      distanceKm: 3,
      paceSecondsPerKm: 333.333,
      heartRate: { average: 150 },
    }),
    run({
      startedAt: new Date("2026-06-24T10:00:00.000Z"),
      durationSeconds: 2000,
      distanceKm: 5,
      paceSecondsPerKm: 400,
    }),
  ];
  const { weeks } = bucketCompletedWeeks(activities, now);
  assert.equal(weeks[11].averageHeartRate, 150);
  assert.equal(weeks[11].activitiesWithHeartRate, 1);
}

function testWalksCountedSeparately() {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const activities = [
    run({
      startedAt: new Date("2026-06-23T10:00:00.000Z"),
      distanceKm: 10,
      durationSeconds: 3600,
      elevationGainMeters: 50,
      sufferScore: 40,
    }),
    walk({
      startedAt: new Date("2026-06-24T10:00:00.000Z"),
      distanceKm: 4,
      elevationGainMeters: 10,
    }),
  ];
  const { weeks } = bucketCompletedWeeks(activities, now);
  const week = weeks[11];
  assert.equal(week.runs, 1);
  assert.equal(week.distanceKm, 10);
  assert.equal(week.walkCount, 1);
  assert.equal(week.walkDistanceKm, 4);
  assert.equal(week.elevationGainMeters, 50);
  assert.equal(week.totalSufferScore, 40);
  assert.equal(week.longestRunKm, 10);
}

testMondayUtcNormalisation();
testMondayStaysMonday();
testSundayMapsToPreviousMonday();
testExactly12CompletedWeeksExcludingCurrent();
testEmptyWeeksZeroFilled();
testInProgressWeekExcludedFromWeeks();
testCurrentWeekDistance();
testMondayBoundaryActivityLandsInCorrectWeek();
testDistanceWeightedPace();
testDurationWeightedHrIgnoresRunsWithoutHr();
testWalksCountedSeparately();

console.log("weeks tests passed");
