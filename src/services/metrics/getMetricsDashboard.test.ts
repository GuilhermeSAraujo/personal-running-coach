import assert from "node:assert/strict";
import { mapAthleteSnapshotToMetricsDashboard } from "./getMetricsDashboard";

function testNullSnapshotIsEmpty() {
  assert.deepEqual(mapAthleteSnapshotToMetricsDashboard(null), { empty: true });
}

function testMapsKpisAndWeeks() {
  const snapshot = {
    generatedAt: new Date("2026-08-10T12:00:00.000Z"),
    recentTraining: {
      weeks: [
        {
          weekStart: new Date("2026-06-02T00:00:00.000Z"),
          runs: 0,
          distanceKm: 0,
          durationSeconds: 0,
          longestRunKm: 0,
          activitiesWithHeartRate: 0,
          elevationGainMeters: 0,
          walkCount: 0,
          walkDistanceKm: 0,
        },
        {
          weekStart: new Date("2026-06-09T00:00:00.000Z"),
          runs: 3,
          distanceKm: 25.5,
          durationSeconds: 9000,
          longestRunKm: 12,
          averagePaceSecondsPerKm: 330,
          activitiesWithHeartRate: 2,
          elevationGainMeters: 100,
          walkCount: 0,
          walkDistanceKm: 0,
        },
      ],
    },
    currentState: {
      weeklyVolumeKm: { average12w: 20, average4w: 22, currentWeek: 8.5 },
      frequency: { averageRunsPerWeek12w: 3, averageRunsPerWeek4w: 3.5 },
      longRun: { currentLongestKm: 14, averageKm12w: 11 },
      consistency: { weeksWithAtLeast3Runs: 8, totalWeeks: 12 },
      trends: { volume: "increasing" as const, pace: "improving" as const },
      heartRateCoverage: 0.5,
    },
  };

  const result = mapAthleteSnapshotToMetricsDashboard(snapshot);
  assert.equal(result.empty, false);
  if (result.empty) return;

  assert.equal(result.generatedAt, "2026-08-10T12:00:00.000Z");
  assert.deepEqual(result.kpis, {
    currentWeekVolumeKm: 8.5,
    averageRunsPerWeek4w: 3.5,
    currentLongestKm: 14,
    paceTrend: "improving",
  });
  assert.equal(result.weeks.length, 2);
  assert.equal(result.weeks[0]!.distanceKm, 0);
  assert.equal(result.weeks[0]!.averagePaceSecondsPerKm, null);
  assert.equal(result.weeks[1]!.runs, 3);
  assert.equal(result.weeks[1]!.averagePaceSecondsPerKm, 330);
  assert.equal(result.weeks[1]!.label.includes("/"), true);
}

function testMissingPaceTrendIsNull() {
  const snapshot = {
    generatedAt: new Date("2026-08-10T12:00:00.000Z"),
    recentTraining: { weeks: [] },
    currentState: {
      weeklyVolumeKm: { average12w: 0, average4w: 0, currentWeek: 0 },
      frequency: { averageRunsPerWeek12w: 0, averageRunsPerWeek4w: 0 },
      longRun: { currentLongestKm: 0, averageKm12w: 0 },
      consistency: { weeksWithAtLeast3Runs: 0, totalWeeks: 12 },
      trends: { volume: "stable" as const },
      heartRateCoverage: 0,
    },
  };
  const result = mapAthleteSnapshotToMetricsDashboard(snapshot);
  assert.equal(result.empty, false);
  if (result.empty) return;
  assert.equal(result.kpis.paceTrend, null);
}

testNullSnapshotIsEmpty();
testMapsKpisAndWeeks();
testMissingPaceTrendIsNull();
console.log("getMetricsDashboard tests passed");
