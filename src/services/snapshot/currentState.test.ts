import assert from "node:assert/strict";
import type { IWeeklyTraining } from "@/models";
import type { SnapshotActivityInput } from "./types";
import { buildCurrentState } from "./currentState";
import { bucketCompletedWeeks } from "./weeks";

function emptyWeek(weekStart: string, overrides: Partial<IWeeklyTraining> = {}): IWeeklyTraining {
  return {
    weekStart: new Date(weekStart),
    runs: 0,
    distanceKm: 0,
    durationSeconds: 0,
    longestRunKm: 0,
    activitiesWithHeartRate: 0,
    elevationGainMeters: 0,
    walkCount: 0,
    walkDistanceKm: 0,
    ...overrides,
  };
}

function make12Weeks(
  fill: (index: number) => Partial<IWeeklyTraining>,
): IWeeklyTraining[] {
  // windowStart = 2026-04-06, then 12 weeks
  const weeks: IWeeklyTraining[] = [];
  const start = new Date("2026-04-06T00:00:00.000Z").getTime();
  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(start + i * 7 * 24 * 60 * 60 * 1000);
    weeks.push(emptyWeek(weekStart.toISOString(), fill(i)));
  }
  return weeks;
}

function run(
  partial: Partial<SnapshotActivityInput> & { startedAt: Date; distanceKm: number },
): SnapshotActivityInput {
  return {
    type: "run",
    durationSeconds: partial.durationSeconds ?? partial.distanceKm * 360,
    paceSecondsPerKm:
      partial.paceSecondsPerKm ??
      (partial.durationSeconds ?? partial.distanceKm * 360) / partial.distanceKm,
    elevationGainMeters: 0,
    ...partial,
  };
}

function testTotalWeeksExcludesBeforeFirstActivity() {
  const weeks = make12Weeks(() => ({ runs: 3, distanceKm: 20 }));
  // first activity in week index 9 (0-based) → only weeks 9,10,11 count = 3
  const firstActivityAt = weeks[9].weekStart;
  const state = buildCurrentState({
    weeks,
    activities: [],
    windowStart: weeks[0].weekStart,
    windowEnd: new Date("2026-06-29T00:00:00.000Z"),
    now: new Date("2026-07-01T12:00:00.000Z"),
    firstActivityAt,
  });
  assert.equal(state.consistency.totalWeeks, 3);
  assert.equal(state.consistency.weeksWithAtLeast3Runs, 12);
}

function testVolumeTrendIncreasing() {
  const weeks = make12Weeks((i) => ({
    runs: 3,
    distanceKm: i < 8 ? 10 : 20,
    durationSeconds: i < 8 ? 3600 : 7200,
  }));
  const state = buildCurrentState({
    weeks,
    activities: [],
    windowStart: weeks[0].weekStart,
    windowEnd: new Date("2026-06-29T00:00:00.000Z"),
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.equal(state.trends.volume, "increasing");
  assert.equal(state.weeklyVolumeKm.average12w, (10 * 8 + 20 * 4) / 12);
  assert.equal(state.weeklyVolumeKm.average4w, 20);
}

function testVolumeTrendDecreasing() {
  const weeks = make12Weeks((i) => ({
    runs: 3,
    distanceKm: i < 8 ? 20 : 10,
    durationSeconds: i < 8 ? 7200 : 3600,
  }));
  const state = buildCurrentState({
    weeks,
    activities: [],
    windowStart: weeks[0].weekStart,
    windowEnd: new Date("2026-06-29T00:00:00.000Z"),
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.equal(state.trends.volume, "decreasing");
}

function testVolumeTrendStable() {
  const weeks = make12Weeks(() => ({
    runs: 3,
    distanceKm: 15,
    durationSeconds: 5400,
  }));
  const state = buildCurrentState({
    weeks,
    activities: [],
    windowStart: weeks[0].weekStart,
    windowEnd: new Date("2026-06-29T00:00:00.000Z"),
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.equal(state.trends.volume, "stable");
}

function testVolumeTrendZeroPrior() {
  const weeks = make12Weeks((i) => ({
    runs: i < 8 ? 0 : 3,
    distanceKm: i < 8 ? 0 : 15,
    durationSeconds: i < 8 ? 0 : 5400,
  }));
  const state = buildCurrentState({
    weeks,
    activities: [],
    windowStart: weeks[0].weekStart,
    windowEnd: new Date("2026-06-29T00:00:00.000Z"),
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.equal(state.trends.volume, "increasing");
}

function testVolumeTrendAllZero() {
  const weeks = make12Weeks(() => ({}));
  const state = buildCurrentState({
    weeks,
    activities: [],
    windowStart: weeks[0].weekStart,
    windowEnd: new Date("2026-06-29T00:00:00.000Z"),
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.equal(state.trends.volume, "stable");
}

function testMidWeekSnapshotDoesNotFakeDecreasing() {
  // Real bucketed weeks: prior weeks had volume, current mid-week run exists
  const now = new Date("2026-07-01T12:00:00.000Z");
  const activities: SnapshotActivityInput[] = [];
  // Fill 12 completed weeks with ~20km each via synthetic activities
  for (let w = 0; w < 12; w++) {
    const monday = new Date("2026-04-06T00:00:00.000Z").getTime() + w * 7 * 86400000;
    for (let r = 0; r < 3; r++) {
      activities.push(
        run({
          startedAt: new Date(monday + (r + 1) * 86400000),
          distanceKm: 7,
          durationSeconds: 7 * 360,
        }),
      );
    }
  }
  // Mid-week current run (should NOT pull averages down)
  activities.push(
    run({
      startedAt: new Date("2026-06-30T10:00:00.000Z"),
      distanceKm: 1,
      durationSeconds: 360,
    }),
  );

  const { weeks, windowStart, windowEnd } = bucketCompletedWeeks(activities, now);
  const state = buildCurrentState({
    weeks,
    activities,
    windowStart,
    windowEnd,
    now,
  });
  assert.equal(state.trends.volume, "stable");
  assert.equal(state.weeklyVolumeKm.currentWeek, 1);
  assert.ok(state.weeklyVolumeKm.average4w > 15);
}

function testCurrentLongestIncludesCurrentWeek() {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const weeks = make12Weeks(() => ({ runs: 1, distanceKm: 5, longestRunKm: 5 }));
  const activities = [
    run({
      startedAt: new Date("2026-06-30T10:00:00.000Z"),
      distanceKm: 14,
      durationSeconds: 14 * 360,
    }),
  ];
  const state = buildCurrentState({
    weeks,
    activities,
    windowStart: weeks[0].weekStart,
    windowEnd: new Date("2026-06-29T00:00:00.000Z"),
    now,
  });
  assert.equal(state.longRun.currentLongestKm, 14);
}

function testPaceTrendOmittedBelowThreeRuns() {
  // Prior period has only 2 runs total (< 3) → pace trend omitted
  const weeks = make12Weeks((i) => ({
    runs: i === 0 || i === 1 ? 1 : 0,
    distanceKm: i === 0 || i === 1 ? 5 : 0,
    durationSeconds: i === 0 || i === 1 ? 2000 : 0,
    averagePaceSecondsPerKm: i === 0 || i === 1 ? 400 : undefined,
  }));
  const state = buildCurrentState({
    weeks,
    activities: [],
    windowStart: weeks[0].weekStart,
    windowEnd: new Date("2026-06-29T00:00:00.000Z"),
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.equal("pace" in state.trends, false);
}

function testHrTrendOmittedBelowCoverage() {
  // Enough runs but low HR coverage
  const weeks = make12Weeks(() => ({
    runs: 4,
    distanceKm: 20,
    durationSeconds: 7200,
    averagePaceSecondsPerKm: 360,
    activitiesWithHeartRate: 1,
    averageHeartRate: 150,
  }));
  // Need activities for beats-per-km calculation - trends use weeks + activities
  const activities: SnapshotActivityInput[] = [];
  for (let w = 0; w < 12; w++) {
    const monday = new Date("2026-04-06T00:00:00.000Z").getTime() + w * 7 * 86400000;
    for (let r = 0; r < 4; r++) {
      activities.push(
        run({
          startedAt: new Date(monday + (r + 1) * 86400000),
          distanceKm: 5,
          durationSeconds: 1800,
          heartRate: r === 0 ? { average: 150 } : undefined,
        }),
      );
    }
  }
  const state = buildCurrentState({
    weeks,
    activities,
    windowStart: weeks[0].weekStart,
    windowEnd: new Date("2026-06-29T00:00:00.000Z"),
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  // coverage = 1/4 = 0.25 < 0.5
  assert.equal("heartRate" in state.trends, false);
}

function testHrTrendImprovingWhenBeatsPerKmFalls() {
  // Prior: slow pace + lower HR; Recent: faster pace + higher raw HR but better efficiency
  // Prior: pace 400 s/km, HR 140 → bpm/km = 140 * 400 / 60 = 933.33
  // Recent: pace 300 s/km, HR 155 → bpm/km = 155 * 300 / 60 = 775
  // ratio = 775/933.33 ≈ 0.83 → improving
  const weeks = make12Weeks((i) => ({
    runs: 4,
    distanceKm: 20,
    durationSeconds: i < 8 ? 8000 : 6000,
    averagePaceSecondsPerKm: i < 8 ? 400 : 300,
    activitiesWithHeartRate: 4,
    averageHeartRate: i < 8 ? 140 : 155,
  }));

  const activities: SnapshotActivityInput[] = [];
  for (let w = 0; w < 12; w++) {
    const monday = new Date("2026-04-06T00:00:00.000Z").getTime() + w * 7 * 86400000;
    const pace = w < 8 ? 400 : 300;
    const hr = w < 8 ? 140 : 155;
    for (let r = 0; r < 4; r++) {
      activities.push(
        run({
          startedAt: new Date(monday + (r + 1) * 86400000),
          distanceKm: 5,
          durationSeconds: 5 * pace,
          paceSecondsPerKm: pace,
          heartRate: { average: hr },
        }),
      );
    }
  }

  const state = buildCurrentState({
    weeks,
    activities,
    windowStart: weeks[0].weekStart,
    windowEnd: new Date("2026-06-29T00:00:00.000Z"),
    now: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert.equal(state.trends.heartRate, "improving");
  assert.equal(state.trends.pace, "improving");
}

testTotalWeeksExcludesBeforeFirstActivity();
testVolumeTrendIncreasing();
testVolumeTrendDecreasing();
testVolumeTrendStable();
testVolumeTrendZeroPrior();
testVolumeTrendAllZero();
testMidWeekSnapshotDoesNotFakeDecreasing();
testCurrentLongestIncludesCurrentWeek();
testPaceTrendOmittedBelowThreeRuns();
testHrTrendOmittedBelowCoverage();
testHrTrendImprovingWhenBeatsPerKmFalls();

console.log("currentState tests passed");
