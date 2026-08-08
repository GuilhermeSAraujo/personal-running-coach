import assert from "node:assert/strict";
import {
  addUtcDays,
  rollingWeekDates,
  rollingWeekWindow,
  utcDateString,
} from "./planWindow";

function testUtcDateString() {
  assert.equal(utcDateString(new Date("2026-08-08T15:30:00.000Z")), "2026-08-08");
}

function testRollingWeekDates() {
  const dates = rollingWeekDates(new Date("2026-08-08T22:00:00.000Z"));
  assert.deepEqual(dates, [
    "2026-08-08",
    "2026-08-09",
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
    "2026-08-14",
  ]);
  assert.deepEqual(rollingWeekWindow(new Date("2026-08-08T22:00:00.000Z")), {
    startDate: "2026-08-08",
    endDate: "2026-08-14",
  });
}

function testAddUtcDays() {
  assert.equal(
    utcDateString(addUtcDays(new Date("2026-08-08T12:00:00.000Z"), 6)),
    "2026-08-14",
  );
}

testUtcDateString();
testRollingWeekDates();
testAddUtcDays();
console.log("planWindow tests passed");
