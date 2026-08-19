import assert from "node:assert/strict";
import type { IUserGoal } from "@/models";
import type { ProgressFollowUp } from "@/services/progress/types";
import { formatDailyCoachPrompt } from "./formatDailyCoachPrompt";

const goal: IUserGoal = {
  type: "half_marathon",
  distanceKm: 21.1,
  targetTimeSeconds: 6300,
  targetDate: new Date("2026-10-04T00:00:00.000Z"),
};

const progress: ProgressFollowUp = {
  thisWeek: {
    planId: "plan1",
    sessions: [
      {
        order: 1,
        scheduledDate: "2026-08-14",
        title: "Easy 8k",
        type: "easy",
        purpose: "aerobic base",
        totalDistanceKmMin: 8,
        totalDistanceKmMax: 10,
        paceMinPerKm: 6.2,
        paceMaxPerKm: 6.6,
        status: "matched",
        activity: {
          id: "a1",
          distanceKm: 9.2,
          durationSeconds: 3300,
          paceSecondsPerKm: 358,
          startedAt: "2026-08-14T10:00:00.000Z",
        },
      },
      {
        order: 2,
        scheduledDate: "2026-08-15",
        title: "Rest",
        type: "rest",
        purpose: "recovery",
        status: "open",
      },
    ],
  },
  history: [
    {
      kind: "unplanned",
      date: "2026-08-12",
      activity: {
        id: "a2",
        distanceKm: 5,
        durationSeconds: 1800,
        paceSecondsPerKm: 360,
        startedAt: "2026-08-12T09:00:00.000Z",
      },
    },
    {
      kind: "matched",
      scheduledDate: "2026-07-20",
      title: "Old long run",
      type: "long_run",
      purpose: "endurance",
      activity: {
        id: "a3",
        distanceKm: 18,
        durationSeconds: 7200,
        paceSecondsPerKm: 400,
        startedAt: "2026-07-20T08:00:00.000Z",
      },
    },
  ],
};

function testIncludesGoalTodayAndRecentPlanVsRuns() {
  const text = formatDailyCoachPrompt({
    goal,
    progress,
    now: new Date("2026-08-15T12:00:00.000Z"),
  });

  assert.match(text, /^TODAY\ndate=2026-08-15/m);
  assert.match(text, /GOAL\ntype=half_marathon/);
  assert.match(text, /distance=21\.1km/);
  assert.match(text, /targetTime=1:45:00/);
  assert.match(text, /targetDate=2026-10-04/);
  assert.match(text, /PLAN_VS_RUNS/);
  assert.match(
    text,
    /2026-08-14 type=easy title=Easy 8k status=matched scheduled=8-10km scheduledPace=6\.2-6\.6 actual=9\.2km pace=5\.97/,
  );
  assert.match(text, /2026-08-15 type=rest title=Rest status=open/);
  assert.doesNotMatch(text, /2026-08-15 type=rest .*scheduled=/);
  assert.match(text, /2026-08-12 unplanned actual=5km/);
  assert.doesNotMatch(text, /2026-08-12 unplanned .*scheduled=/);
}

function testSingleScheduledDistanceAndPace() {
  const text = formatDailyCoachPrompt({
    goal,
    progress: {
      thisWeek: {
        planId: "plan1",
        sessions: [
          {
            order: 1,
            scheduledDate: "2026-08-12",
            title: "Ritmo Forte 10k",
            type: "tempo",
            purpose: "threshold",
            totalDistanceKmMin: 10,
            totalDistanceKmMax: 10,
            paceMinPerKm: 5.45,
            paceMaxPerKm: 5.45,
            status: "matched",
            activity: {
              id: "a1",
              distanceKm: 10.6,
              durationSeconds: 3745,
              paceSecondsPerKm: 353.4,
              startedAt: "2026-08-12T10:00:00.000Z",
            },
          },
        ],
      },
      history: [],
    },
    now: new Date("2026-08-15T12:00:00.000Z"),
  });

  assert.match(
    text,
    /2026-08-12 type=tempo title=Ritmo Forte 10k status=matched scheduled=10km scheduledPace=5\.45 actual=10\.6km pace=5\.89/,
  );
}

function testOmitsRunsOlderThan14Days() {
  const text = formatDailyCoachPrompt({
    goal,
    progress,
    now: new Date("2026-08-15T12:00:00.000Z"),
  });

  assert.doesNotMatch(text, /Old long run/);
  assert.doesNotMatch(text, /2026-07-20/);
}

function testWorksWithoutPlan() {
  const text = formatDailyCoachPrompt({
    goal,
    progress: { thisWeek: null, history: [] },
    now: new Date("2026-08-15T12:00:00.000Z"),
  });

  assert.match(text, /PLAN_VS_RUNS\nnone/);
  assert.match(text, /GOAL/);
}

testIncludesGoalTodayAndRecentPlanVsRuns();
testSingleScheduledDistanceAndPace();
testOmitsRunsOlderThan14Days();
testWorksWithoutPlan();
console.log("formatDailyCoachPrompt tests passed");
