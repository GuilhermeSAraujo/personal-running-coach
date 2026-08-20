import assert from "node:assert/strict";
import {
  resolveOpenSessionDate,
  sessionPlanDayPath,
} from "./sessionPlanNav";

const sessions = [
  { scheduledDate: "2026-08-20" },
  { scheduledDate: "2026-08-25" },
];

function testSessionPlanDayPathIncludesPlanIdAndDate() {
  assert.equal(
    sessionPlanDayPath("plan123", "2026-08-25"),
    "/session-plans/plan123?date=2026-08-25",
  );
}

function testResolveOpenSessionDateReturnsMatchingDate() {
  assert.equal(
    resolveOpenSessionDate(sessions, "2026-08-25"),
    "2026-08-25",
  );
}

function testResolveOpenSessionDateReturnsNullWhenMissing() {
  assert.equal(resolveOpenSessionDate(sessions, undefined), null);
  assert.equal(resolveOpenSessionDate(sessions, null), null);
  assert.equal(resolveOpenSessionDate(sessions, ""), null);
}

function testResolveOpenSessionDateReturnsNullWhenUnknown() {
  assert.equal(resolveOpenSessionDate(sessions, "2026-01-01"), null);
}

testSessionPlanDayPathIncludesPlanIdAndDate();
testResolveOpenSessionDateReturnsMatchingDate();
testResolveOpenSessionDateReturnsNullWhenMissing();
testResolveOpenSessionDateReturnsNullWhenUnknown();
console.log("sessionPlanNav tests passed");
