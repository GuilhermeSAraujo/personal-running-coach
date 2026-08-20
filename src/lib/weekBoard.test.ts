import assert from "node:assert/strict";
import {
  buildHomeHistory,
  buildWeekBoard,
  selectWeekDay,
  type WeekDay,
} from "./weekBoard";
import type {
  ProgressSession,
  ProgressTimelineItem,
} from "@/services/progress/types";

const NOW = new Date("2026-08-20T15:00:00.000Z");
const TODAY = "2026-08-20";

const activity = {
  id: "act1",
  distanceKm: 8,
  durationSeconds: 2400,
  paceSecondsPerKm: 300,
  startedAt: "2026-08-19T10:00:00.000Z",
};

function session(
  overrides: Partial<ProgressSession> &
    Pick<ProgressSession, "order" | "scheduledDate" | "type" | "status">,
): ProgressSession {
  return {
    title: overrides.title ?? overrides.type,
    purpose: overrides.purpose ?? "train",
    ...overrides,
  };
}

function statuses(days: WeekDay[]): WeekDay["status"][] {
  return days.map((day) => day.status);
}

function testBoardIsSevenDatesStartingToday() {
  const days = buildWeekBoard([], NOW);
  assert.equal(days.length, 7);
  assert.deepEqual(
    days.map((day) => day.date),
    [
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
      "2026-08-24",
      "2026-08-25",
      "2026-08-26",
    ],
  );
  assert.equal(days[0]!.isToday, true);
  assert.ok(days.slice(1).every((day) => day.isToday === false));
  assert.ok(days.every((day) => day.status === "empty" && day.session === null));
}

function testSessionsMapOntoMatchingCells() {
  const days = buildWeekBoard(
    [
      session({
        order: 1,
        scheduledDate: "2026-08-20",
        type: "easy",
        status: "open",
        title: "Easy",
      }),
      session({
        order: 2,
        scheduledDate: "2026-08-22",
        type: "long_run",
        status: "open",
        title: "Long",
      }),
    ],
    NOW,
  );

  assert.equal(days[0]!.session?.title, "Easy");
  assert.equal(days[0]!.status, "open");
  assert.equal(days[1]!.status, "empty");
  assert.equal(days[2]!.session?.title, "Long");
  assert.equal(days[2]!.status, "open");
}

function testDaysAfterOpenPlanAreEmpty() {
  const days = buildWeekBoard(
    [
      session({
        order: 4,
        scheduledDate: "2026-08-20",
        type: "tempo",
        status: "open",
      }),
      session({
        order: 5,
        scheduledDate: "2026-08-21",
        type: "rest",
        status: "open",
      }),
    ],
    NOW,
  );

  assert.deepEqual(statuses(days), [
    "open",
    "rest",
    "empty",
    "empty",
    "empty",
    "empty",
    "empty",
  ]);
}

function testPastDatedSessionsAreNotOnTheBoard() {
  const days = buildWeekBoard(
    [
      session({
        order: 1,
        scheduledDate: "2026-08-18",
        type: "easy",
        status: "matched",
        title: "Monday easy",
        activity,
      }),
      session({
        order: 2,
        scheduledDate: "2026-08-19",
        type: "rest",
        status: "open",
      }),
      session({
        order: 3,
        scheduledDate: "2026-08-20",
        type: "tempo",
        status: "open",
        title: "Today tempo",
      }),
    ],
    NOW,
  );

  assert.equal(days[0]!.session?.title, "Today tempo");
  assert.ok(
    days.every(
      (day) =>
        day.session?.scheduledDate !== "2026-08-18" &&
        day.session?.scheduledDate !== "2026-08-19",
    ),
  );
}

function testRestMatchedAndOpenStatuses() {
  const days = buildWeekBoard(
    [
      session({
        order: 1,
        scheduledDate: "2026-08-20",
        type: "easy",
        status: "matched",
        activity,
      }),
      session({
        order: 2,
        scheduledDate: "2026-08-21",
        type: "rest",
        status: "matched",
      }),
      session({
        order: 3,
        scheduledDate: "2026-08-22",
        type: "rest",
        status: "open",
      }),
      session({
        order: 4,
        scheduledDate: "2026-08-23",
        type: "interval",
        status: "open",
      }),
    ],
    NOW,
  );

  assert.deepEqual(statuses(days).slice(0, 4), [
    "matched",
    "rest",
    "rest",
    "open",
  ]);
}

function testPastMatchedThisWeekSessionsJoinHistory() {
  const thisWeek: ProgressSession[] = [
    session({
      order: 1,
      scheduledDate: "2026-08-19",
      type: "easy",
      status: "matched",
      title: "Yesterday easy",
      purpose: "aerobic",
      totalDistanceKmMin: 7,
      totalDistanceKmMax: 9,
      activity,
    }),
    session({
      order: 2,
      scheduledDate: "2026-08-20",
      type: "tempo",
      status: "open",
      title: "Today tempo",
    }),
  ];
  const history: ProgressTimelineItem[] = [
    {
      kind: "unplanned",
      date: "2026-08-10",
      activity: { ...activity, id: "old", startedAt: "2026-08-10T09:00:00.000Z" },
    },
  ];

  const merged = buildHomeHistory(thisWeek, history, TODAY);

  assert.equal(merged[0]!.kind, "matched");
  if (merged[0]!.kind !== "matched") return;
  assert.equal(merged[0].scheduledDate, "2026-08-19");
  assert.equal(merged[0].title, "Yesterday easy");
  assert.equal(merged[0].activity?.id, "act1");
  assert.equal(merged[1]!.kind, "unplanned");
}

function testUnmatchedAndRestPastDaysStayOffHistory() {
  const thisWeek: ProgressSession[] = [
    session({
      order: 1,
      scheduledDate: "2026-08-18",
      type: "easy",
      status: "open",
      title: "Skipped easy",
    }),
    session({
      order: 2,
      scheduledDate: "2026-08-19",
      type: "rest",
      status: "open",
    }),
    session({
      order: 3,
      scheduledDate: "2026-08-19",
      type: "rest",
      status: "matched",
    }),
    session({
      order: 4,
      scheduledDate: "2026-08-20",
      type: "easy",
      status: "matched",
      activity,
    }),
  ];

  const merged = buildHomeHistory(thisWeek, [], TODAY);
  assert.deepEqual(merged, []);
}

function testSelectWeekDayDefaultsToToday() {
  const days = buildWeekBoard(
    [
      session({
        order: 1,
        scheduledDate: "2026-08-20",
        type: "easy",
        status: "open",
        title: "Today easy",
      }),
      session({
        order: 2,
        scheduledDate: "2026-08-22",
        type: "long_run",
        status: "open",
        title: "Saturday long",
      }),
    ],
    NOW,
  );

  const selected = selectWeekDay(days, null);
  assert.equal(selected.isToday, true);
  assert.equal(selected.session?.title, "Today easy");
}

function testSelectWeekDayReturnsMatchingDay() {
  const days = buildWeekBoard(
    [
      session({
        order: 1,
        scheduledDate: "2026-08-20",
        type: "easy",
        status: "open",
        title: "Today easy",
      }),
      session({
        order: 2,
        scheduledDate: "2026-08-22",
        type: "long_run",
        status: "open",
        title: "Saturday long",
      }),
    ],
    NOW,
  );

  const selected = selectWeekDay(days, "2026-08-22");
  assert.equal(selected.date, "2026-08-22");
  assert.equal(selected.isToday, false);
  assert.equal(selected.session?.title, "Saturday long");
}

function testSelectWeekDayFallsBackToTodayWhenUnknown() {
  const days = buildWeekBoard(
    [
      session({
        order: 1,
        scheduledDate: "2026-08-20",
        type: "easy",
        status: "open",
        title: "Today easy",
      }),
    ],
    NOW,
  );

  const selected = selectWeekDay(days, "2026-01-01");
  assert.equal(selected.date, "2026-08-20");
  assert.equal(selected.isToday, true);
}

testBoardIsSevenDatesStartingToday();
testSessionsMapOntoMatchingCells();
testDaysAfterOpenPlanAreEmpty();
testPastDatedSessionsAreNotOnTheBoard();
testRestMatchedAndOpenStatuses();
testPastMatchedThisWeekSessionsJoinHistory();
testUnmatchedAndRestPastDaysStayOffHistory();
testSelectWeekDayDefaultsToToday();
testSelectWeekDayReturnsMatchingDay();
testSelectWeekDayFallsBackToTodayWhenUnknown();
console.log("weekBoard tests passed");
