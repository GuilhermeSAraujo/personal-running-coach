import assert from "node:assert/strict";
import {
  planLastActivityReset,
  type ResetSessionPlanRef,
  type ResetSnapshotRef,
} from "./resetLastActivity";

const t0 = new Date("2026-08-01T00:00:00.000Z");
const tImport = new Date("2026-08-10T08:00:00.000Z");
const tAfter = new Date("2026-08-10T08:01:00.000Z");
const tRegen = new Date("2026-08-10T08:05:00.000Z");

function snapshot(
  id: string,
  createdAt: Date,
): ResetSnapshotRef {
  return { id, createdAt };
}

function plan(overrides: Partial<ResetSessionPlanRef> & Pick<ResetSessionPlanRef, "id" | "createdAt">): ResetSessionPlanRef {
  return {
    status: "open",
    sessions: [],
    ...overrides,
  };
}

function testConfirmRollbackDeletesDerivedAndUnmatchesPriorPlan() {
  const result = planLastActivityReset({
    activity: { id: "act-new", createdAt: tImport },
    snapshots: [snapshot("snap-old", t0), snapshot("snap-new", tAfter)],
    sessionPlans: [
      plan({
        id: "plan-old",
        createdAt: t0,
        status: "superseded",
        sessions: [
          { order: 1, activityId: "act-new" },
          { order: 2, activityId: null },
        ],
      }),
      plan({
        id: "plan-new",
        createdAt: tAfter,
        status: "open",
        sessions: [{ order: 1, activityId: null }],
      }),
    ],
  });

  assert.equal(result.activityId, "act-new");
  assert.deepEqual(result.snapshotIdsToDelete, ["snap-new"]);
  assert.deepEqual(result.planIdsToDelete, ["plan-new"]);
  assert.equal(result.planIdToReopen, "plan-old");
  assert.deepEqual(result.unmatches, [
    { planId: "plan-old", sessionOrders: [1] },
  ]);
}

function testSkipMatchKeepsExistingSnapshotAndPlan() {
  const result = planLastActivityReset({
    activity: { id: "act-new", createdAt: tImport },
    snapshots: [snapshot("snap-open", t0)],
    sessionPlans: [
      plan({
        id: "plan-open",
        createdAt: t0,
        status: "open",
        sessions: [{ order: 1, activityId: null }],
      }),
    ],
  });

  assert.deepEqual(result.snapshotIdsToDelete, []);
  assert.deepEqual(result.planIdsToDelete, []);
  assert.equal(result.planIdToReopen, "plan-open");
  assert.deepEqual(result.unmatches, []);
}

function testFirstSyncLeavesNothingToReopen() {
  const result = planLastActivityReset({
    activity: { id: "act-first", createdAt: tImport },
    snapshots: [snapshot("snap-first", tAfter)],
    sessionPlans: [
      plan({
        id: "plan-first",
        createdAt: tAfter,
        status: "open",
      }),
    ],
  });

  assert.deepEqual(result.snapshotIdsToDelete, ["snap-first"]);
  assert.deepEqual(result.planIdsToDelete, ["plan-first"]);
  assert.equal(result.planIdToReopen, null);
  assert.deepEqual(result.unmatches, []);
}

function testUnmatchOnlyTouchesRemainingPlans() {
  const result = planLastActivityReset({
    activity: { id: "act-new", createdAt: tImport },
    snapshots: [snapshot("snap-new", tAfter)],
    sessionPlans: [
      plan({
        id: "plan-old",
        createdAt: t0,
        status: "superseded",
        sessions: [{ order: 3, activityId: "act-new" }],
      }),
      plan({
        id: "plan-new",
        createdAt: tAfter,
        status: "open",
        sessions: [{ order: 1, activityId: "act-new" }],
      }),
    ],
  });

  assert.deepEqual(result.planIdsToDelete, ["plan-new"]);
  assert.deepEqual(result.unmatches, [
    { planId: "plan-old", sessionOrders: [3] },
  ]);
}

function testDeletesAllSnapshotsAndPlansCreatedAfterImport() {
  const result = planLastActivityReset({
    activity: { id: "act-new", createdAt: tImport },
    snapshots: [
      snapshot("snap-old", t0),
      snapshot("snap-confirm", tAfter),
      snapshot("snap-regen", tRegen),
    ],
    sessionPlans: [
      plan({ id: "plan-old", createdAt: t0, status: "superseded" }),
      plan({ id: "plan-confirm", createdAt: tAfter, status: "superseded" }),
      plan({ id: "plan-regen", createdAt: tRegen, status: "open" }),
    ],
  });

  assert.deepEqual(result.snapshotIdsToDelete, ["snap-confirm", "snap-regen"]);
  assert.deepEqual(result.planIdsToDelete, ["plan-confirm", "plan-regen"]);
  assert.equal(result.planIdToReopen, "plan-old");
}

function testDeletesDerivedDocsWithSameCreatedAtAsImport() {
  const result = planLastActivityReset({
    activity: { id: "act-new", createdAt: tImport },
    snapshots: [snapshot("snap-same", tImport)],
    sessionPlans: [plan({ id: "plan-same", createdAt: tImport })],
  });

  assert.deepEqual(result.snapshotIdsToDelete, ["snap-same"]);
  assert.deepEqual(result.planIdsToDelete, ["plan-same"]);
  assert.equal(result.planIdToReopen, null);
}

function main() {
  testConfirmRollbackDeletesDerivedAndUnmatchesPriorPlan();
  testSkipMatchKeepsExistingSnapshotAndPlan();
  testFirstSyncLeavesNothingToReopen();
  testUnmatchOnlyTouchesRemainingPlans();
  testDeletesAllSnapshotsAndPlansCreatedAfterImport();
  testDeletesDerivedDocsWithSameCreatedAtAsImport();
  console.log("resetLastActivity tests passed");
}

void main();
