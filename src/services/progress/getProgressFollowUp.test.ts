import assert from "node:assert/strict";
import {
  buildPriorMatchByDate,
  matchedDatesInThisWeek,
  overlayPriorMatchesOnThisWeek,
  sortHistoryNewestFirst,
  type PriorMatchedSession,
} from "./getProgressFollowUp";
import type { ProgressSession, ProgressTimelineItem } from "./types";

const activity = {
  id: "act1",
  distanceKm: 8,
  durationSeconds: 2400,
  paceSecondsPerKm: 300,
  startedAt: "2026-08-09T10:00:00.000Z",
};

function testOverlayPromotesOpenSessionToMatched() {
  const prior: PriorMatchedSession = {
    scheduledDate: "2026-08-09",
    title: "Corrida Leve de Domingo",
    type: "easy",
    purpose: "aerobic",
    totalDistanceKmMin: 7,
    totalDistanceKmMax: 9,
    activity,
  };
  const sessions: ProgressSession[] = [
    {
      order: 1,
      scheduledDate: "2026-08-09",
      title: "Corrida Leve de Domingo",
      type: "easy",
      purpose: "aerobic",
      status: "open",
    },
    {
      order: 2,
      scheduledDate: "2026-08-10",
      title: "Fácil",
      type: "easy",
      purpose: "keep easy",
      status: "open",
    },
  ];

  const overlaid = overlayPriorMatchesOnThisWeek(
    sessions,
    buildPriorMatchByDate([prior]),
  );

  assert.equal(overlaid[0]!.status, "matched");
  assert.equal(overlaid[0]!.activity?.id, "act1");
  assert.equal(overlaid[1]!.status, "open");
  assert.deepEqual(matchedDatesInThisWeek(overlaid), new Set(["2026-08-09"]));
}

function testHistorySortNewestFirst() {
  const history: ProgressTimelineItem[] = [
    {
      kind: "matched",
      scheduledDate: "2026-08-05",
      title: "Older",
      type: "easy",
      purpose: "x",
      activity: {
        ...activity,
        id: "old",
        startedAt: "2026-08-05T09:00:00.000Z",
      },
    },
    {
      kind: "unplanned",
      date: "2026-08-09",
      activity,
    },
  ];

  const sorted = sortHistoryNewestFirst(history);
  assert.equal(sorted[0]!.kind, "unplanned");
  assert.equal(sorted[1]!.kind, "matched");
}

function testPriorMatchFirstWins() {
  const map = buildPriorMatchByDate([
    {
      scheduledDate: "2026-08-09",
      title: "Newer plan match",
      type: "easy",
      purpose: "a",
      activity,
    },
    {
      scheduledDate: "2026-08-09",
      title: "Older plan match",
      type: "easy",
      purpose: "b",
      activity: { ...activity, id: "act2" },
    },
  ]);
  assert.equal(map.get("2026-08-09")!.title, "Newer plan match");
}

testOverlayPromotesOpenSessionToMatched();
testHistorySortNewestFirst();
testPriorMatchFirstWins();
console.log("progress follow-up helper tests passed");
