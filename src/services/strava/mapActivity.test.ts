import assert from "node:assert/strict";
import { Types } from "mongoose";
import { mapSummaryToActivity } from "./mapActivity";
import type { StravaSummaryActivity } from "./types";

const userId = new Types.ObjectId();

const baseActivity: StravaSummaryActivity = {
  id: 19301307948,
  sport_type: "Run",
  start_date: "2026-07-13T22:10:06Z",
  distance: 6974.1,
  moving_time: 2912,
  total_elevation_gain: 81,
  average_heartrate: 157.8,
  max_heartrate: 182,
};

function testMapsSufferScoreWhenPresent() {
  const mapped = mapSummaryToActivity(userId, {
    ...baseActivity,
    suffer_score: 73,
  });
  assert.equal(mapped.sufferScore, 73);
}

function testOmitsSufferScoreWhenNull() {
  const mapped = mapSummaryToActivity(userId, {
    ...baseActivity,
    suffer_score: null,
  });
  assert.equal("sufferScore" in mapped, false);
}

function testOmitsSufferScoreWhenAbsent() {
  const mapped = mapSummaryToActivity(userId, baseActivity);
  assert.equal("sufferScore" in mapped, false);
}

testMapsSufferScoreWhenPresent();
testOmitsSufferScoreWhenNull();
testOmitsSufferScoreWhenAbsent();

console.log("mapActivity sufferScore tests passed");
