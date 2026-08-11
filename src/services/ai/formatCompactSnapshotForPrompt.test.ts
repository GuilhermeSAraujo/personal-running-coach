import assert from "node:assert/strict";
import type { IAthleteSnapshot } from "@/models";
import { resolveTrainingPresetForSnapshot } from "@/lib/trainingPresets";
import { derivePaceGuardrails } from "./paceGuards";
import { formatCompactSnapshotForPrompt } from "./formatCompactSnapshotForPrompt";

type SnapshotForAi = Omit<IAthleteSnapshot, "userId" | "createdAt">;

function baseSnapshot(overrides: Partial<SnapshotForAi> = {}): SnapshotForAi {
  const weekStarts = [
    "2026-07-06",
    "2026-07-13",
    "2026-07-20",
    "2026-07-27",
    "2026-08-03",
  ].map((d) => new Date(`${d}T00:00:00.000Z`));

  const weeks = weekStarts.map((weekStart, i) => ({
    weekStart,
    runs: i + 1,
    distanceKm: 10 + i * 3.14159,
    durationSeconds: 3600 + i * 100,
    longestRunKm: 5 + i * 1.23456,
    averagePaceSecondsPerKm: 412.1434116673172,
    averageHeartRate: 160 + i,
    activitiesWithHeartRate: 2,
    elevationGainMeters: 100.7 + i,
    totalSufferScore: 50 + i,
    walkCount: 0,
    walkDistanceKm: 0,
  }));

  const snapshot: SnapshotForAi = {
    schemaVersion: 1,
    generatedAt: new Date("2026-08-11T23:21:54.280Z"),
    windowStart: new Date("2026-05-18T00:00:00.000Z"),
    windowEnd: new Date("2026-08-10T00:00:00.000Z"),
    profile: {
      ageYears: 24,
      weightKg: 67.5,
      heightCm: 173,
      firstActivityAt: new Date("2021-09-09T20:35:54.000Z"),
      lifetimeRunCount: 164,
    },
    goal: {
      type: "half_marathon",
      distanceKm: 21.0975,
      targetTimeSeconds: 7140,
      targetDate: new Date("2026-11-22T00:00:00.000Z"),
      weeksUntilTarget: 14,
    },
    trainingStyle: "preset",
    trainingPreset: resolveTrainingPresetForSnapshot("half_marathon"),
    recentTraining: {
      weeks,
      recentActivities: Array.from({ length: 10 }, (_, i) => ({
        date: new Date(`2026-08-${String(10 - i).padStart(2, "0")}T12:00:00.000Z`),
        distanceKm: 7.001234 + i * 0.1,
        durationSeconds: 3300,
        paceSecondsPerKm: 477.0123456789,
        elevationGainMeters: 55.5,
        averageHeartRate: 158 + i,
        maxHeartRate: 180,
        sufferScore: 80 + i,
        athleteFeedback:
          i === 0 ? { effort: "too_easy" as const } : undefined,
      })),
      bestEfforts: {
        "5k": {
          nominalDistanceKm: 5,
          actualDistanceKm: 5.714899999999999,
          actualTimeSeconds: 1960,
          paceSecondsPerKm: 343.4880750319341,
          estimatedTimeSeconds: 1717.4403751596706,
          date: new Date("2026-07-20T12:00:00.000Z"),
          averageHeartRate: 168,
        },
      },
    },
    historicalPerformance: {
      personalBests: {
        "3k": {
          nominalDistanceKm: 3,
          actualDistanceKm: 3.4,
          actualTimeSeconds: 1155,
          paceSecondsPerKm: 339.7,
          estimatedTimeSeconds: 1019,
          date: new Date("2026-06-01T12:00:00.000Z"),
        },
        "5k": {
          nominalDistanceKm: 5,
          actualDistanceKm: 5.71,
          actualTimeSeconds: 1717,
          paceSecondsPerKm: 343.4880750319341,
          estimatedTimeSeconds: 1717,
          date: new Date("2026-07-20T12:00:00.000Z"),
          averageHeartRate: 168,
        },
        "10k": {
          nominalDistanceKm: 10,
          actualDistanceKm: 10.24,
          actualTimeSeconds: 3740,
          paceSecondsPerKm: 374,
          estimatedTimeSeconds: 3740,
          date: new Date("2026-06-15T12:00:00.000Z"),
          averageHeartRate: 175,
        },
      },
      longestRun: {
        date: new Date("2026-06-01T12:00:00.000Z"),
        distanceKm: 18.12345,
        durationSeconds: 7173,
        paceSecondsPerKm: 395.123456,
        elevationGainMeters: 200,
      },
      lifetimeDistanceKm: 818.9123456,
      lifetimeRuns: 164,
    },
    currentState: {
      weeklyVolumeKm: {
        average12w: 16.351234,
        average4w: 21.86111,
        currentWeek: 7.01234,
      },
      frequency: {
        averageRunsPerWeek12w: 2.5,
        averageRunsPerWeek4w: 3,
      },
      longRun: {
        currentLongestKm: 12.14111,
        averageKm12w: 7.79111,
      },
      consistency: {
        weeksWithAtLeast3Runs: 7,
        totalWeeks: 12,
      },
      trends: {
        volume: "increasing",
        pace: "declining",
      },
      heartRateCoverage: 0.48,
    },
  };

  return { ...snapshot, ...overrides };
}

function testIncludesCoreSectionsAndRoundedAthlete() {
  const text = formatCompactSnapshotForPrompt(baseSnapshot(), null);
  assert.match(text, /^ATHLETE\n/m);
  assert.match(text, /^GOAL\n/m);
  assert.match(text, /^CURRENT_STATE\n/m);
  assert.match(text, /^PERFORMANCE\n/m);
  assert.match(text, /^RECENT_WEEKS\n/m);
  assert.match(text, /^RECENT_ACTIVITIES\n/m);
  assert.match(text, /^TRAINING_PRESET\n/m);
  assert.match(text, /age=24/);
  assert.match(text, /weight=67\.5/);
  assert.match(text, /lifetimeDistance=818\.9km/);
  assert.doesNotMatch(text, /schemaVersion/);
  assert.doesNotMatch(text, /generatedAt/);
  assert.doesNotMatch(text, /SecondsPerKm/i);
}

function testGoalUsesClockTime() {
  const text = formatCompactSnapshotForPrompt(baseSnapshot(), null);
  assert.match(text, /targetTime=1:59:00/);
  assert.match(text, /targetDate=2026-11-22/);
  assert.match(text, /weeksRemaining=14/);
  assert.match(text, /type=half_marathon/);
}

function testPerformanceUsesPbClockTimesNotRawEfforts() {
  const text = formatCompactSnapshotForPrompt(baseSnapshot(), null);
  assert.match(text, /PB5k=28:37/);
  assert.match(text, /PB10k=1:02:20/);
  assert.doesNotMatch(text, /nominalDistanceKm/);
  assert.doesNotMatch(text, /estimatedTimeSeconds/);
  assert.doesNotMatch(text, /343\.488/);
}

function testRecentWeeksLimitedToLastFour() {
  const text = formatCompactSnapshotForPrompt(baseSnapshot(), null);
  const weekLines = text
    .split("\n")
    .filter((l) => /^\d{4}-\d{2}-\d{2} runs=/.test(l));
  assert.equal(weekLines.length, 4);
  assert.ok(weekLines.some((l) => l.startsWith("2026-08-03")));
  assert.ok(!weekLines.some((l) => l.startsWith("2026-07-06")));
  assert.ok(weekLines.every((l) => !l.includes("412.143")));
}

function testRecentActivitiesCappedAndKeepsFeedback() {
  const text = formatCompactSnapshotForPrompt(baseSnapshot(), null);
  const activityLines = text
    .split("\n")
    .filter((l) => /^\d{4}-\d{2}-\d{2} \d/.test(l) && l.includes("km"));
  // activities section only — weeks also have dates; filter by pace pattern
  const recentBlock = text.split("RECENT_ACTIVITIES\n")[1]?.split("\n\n")[0] ?? "";
  const lines = recentBlock.split("\n").filter((l) => l.trim());
  assert.equal(lines.length, 8);
  assert.match(recentBlock, /effort=too_easy/);
  assert.doesNotMatch(recentBlock, /maxHeartRate|durationSeconds/);
}

function testPaceRulesWhenGuardsPresent() {
  const snapshot = baseSnapshot();
  const guards = derivePaceGuardrails(snapshot);
  assert.ok(guards);
  const text = formatCompactSnapshotForPrompt(snapshot, guards);
  assert.match(text, /^PACE_RULES\n/m);
  assert.match(text, new RegExp(`easy.*${guards!.easyFloorMinPerKm}`));
  assert.match(text, new RegExp(`work.*${guards!.workFloorMinPerKm}`));
  assert.doesNotMatch(text, /345 s\/km/);
}

function testPresetCompactWithoutPhilosophy() {
  const text = formatCompactSnapshotForPrompt(baseSnapshot(), null);
  assert.match(text, /id=half_marathon_time_long/);
  assert.match(text, /sun=long_run/);
  assert.match(text, /wed=tempo/);
  assert.doesNotMatch(text, /philosophy/i);
  assert.doesNotMatch(text, /Jack Daniels/);
  assert.doesNotMatch(text, /summary=/);
  // rules present once as PRESET_RULES or under TRAINING_PRESET
  assert.match(text, /TIME, not distance|time, not distance/i);
}

function testAdaptiveOneLiner() {
  const text = formatCompactSnapshotForPrompt(
    baseSnapshot({
      trainingStyle: "adaptive",
      trainingPreset: undefined,
    }),
    null,
  );
  assert.doesNotMatch(text, /^TRAINING_PRESET\n/m);
  assert.match(text, /TRAINING_STYLE=adaptive/);
  assert.doesNotMatch(text, /weekTemplate|philosophy/i);
}

function testNoUnroundedFloatNoise() {
  const text = formatCompactSnapshotForPrompt(baseSnapshot(), null);
  assert.doesNotMatch(text, /\d+\.\d{4,}/);
}

testIncludesCoreSectionsAndRoundedAthlete();
testGoalUsesClockTime();
testPerformanceUsesPbClockTimesNotRawEfforts();
testRecentWeeksLimitedToLastFour();
testRecentActivitiesCappedAndKeepsFeedback();
testPaceRulesWhenGuardsPresent();
testPresetCompactWithoutPhilosophy();
testAdaptiveOneLiner();
testNoUnroundedFloatNoise();
console.log("formatCompactSnapshotForPrompt tests passed");
