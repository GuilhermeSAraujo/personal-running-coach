import assert from "node:assert/strict";
import {
  formatActivityDate,
  formatDistanceKm,
  formatDuration,
} from "@/lib/activityFormat";
import { mapUserToProfileView } from "./getProfileView";
import type { ProfileUserInput } from "./types";

const baseUser: ProfileUserInput = {
  profile: { name: "Ada", email: "ada@example.com" },
  createdAt: new Date("2026-01-15T00:00:00.000Z"),
};

function testMapsPresetGoalAndWeekTemplate() {
  const view = mapUserToProfileView({
    user: {
      ...baseUser,
      goal: {
        type: "5k",
        distanceKm: 5,
        targetTimeSeconds: 1800,
        targetDate: new Date("2026-11-01T00:00:00.000Z"),
      },
      trainingStyle: "preset",
    },
  });

  assert.equal(view.name, "Ada");
  assert.equal(view.email, "ada@example.com");
  assert.equal(view.memberSince, "2026-01-15T00:00:00.000Z");
  assert.equal(
    view.memberSinceLabel,
    formatActivityDate("2026-01-15T00:00:00.000Z"),
  );

  assert.equal(view.goal?.type, "5k");
  assert.equal(view.goal?.typeLabel, "5K");
  assert.equal(view.goal?.distanceKm, 5);
  assert.equal(view.goal?.distanceLabel, formatDistanceKm(5));
  assert.equal(view.goal?.targetTimeSeconds, 1800);
  assert.equal(view.goal?.targetTimeLabel, formatDuration(1800));
  assert.equal(view.goal?.targetDate, "2026-11-01T00:00:00.000Z");
  assert.equal(
    view.goal?.targetDateLabel,
    formatActivityDate("2026-11-01T00:00:00.000Z"),
  );

  assert.equal(view.trainingMethod.style, "preset");
  assert.equal(view.trainingMethod.styleLabel, "Structured preset");
  assert.equal(view.trainingMethod.preset?.id, "5k_vdot");
  assert.equal(view.trainingMethod.preset?.name, "5K — Jack Daniels / VDOT");
  assert.ok((view.trainingMethod.preset?.summary.length ?? 0) > 0);
  assert.ok((view.trainingMethod.preset?.philosophy.length ?? 0) > 0);
  assert.ok((view.trainingMethod.preset?.rules.length ?? 0) > 0);

  const week = view.trainingMethod.preset?.weekTemplate ?? [];
  assert.equal(week.length, 7);
  assert.equal(week[0]?.weekday, "monday");
  assert.equal(week[0]?.weekdayLabel, "Monday");
  assert.equal(week[0]?.role, "easy");
  assert.equal(week[0]?.roleLabel, "Easy");
  assert.equal(week[1]?.weekday, "tuesday");
  assert.equal(week[1]?.role, "intervals");
  assert.equal(week[1]?.roleLabel, "Intervals");
  assert.equal(week[6]?.weekday, "sunday");
  assert.equal(week[6]?.role, "long_run");
  assert.equal(week[6]?.roleLabel, "Long run");

  assert.equal("currentPlan" in view, false);
}

function testTreatsMissingStyleAsAdaptive() {
  const view = mapUserToProfileView({ user: baseUser });
  assert.equal(view.trainingMethod.style, "adaptive");
  assert.equal(view.trainingMethod.styleLabel, "Adaptive");
  assert.equal(view.trainingMethod.preset, null);
}

function testAdaptiveStyleHasNoPresetEvenWithGoal() {
  const view = mapUserToProfileView({
    user: {
      ...baseUser,
      goal: {
        type: "10k",
        distanceKm: 10,
        targetTimeSeconds: 3600,
        targetDate: new Date("2026-12-01T00:00:00.000Z"),
      },
      trainingStyle: "adaptive",
    },
  });
  assert.equal(view.trainingMethod.style, "adaptive");
  assert.equal(view.trainingMethod.preset, null);
  assert.equal(view.goal?.typeLabel, "10K");
}

function testNoGoalLeavesGoalNullAndSkipsPreset() {
  const view = mapUserToProfileView({
    user: { ...baseUser, trainingStyle: "preset" },
  });
  assert.equal(view.goal, null);
  assert.equal(view.trainingMethod.style, "preset");
  assert.equal(view.trainingMethod.preset, null);
}

function testOmitsUnsetAthleteFields() {
  const view = mapUserToProfileView({
    user: {
      ...baseUser,
      profile: { ...baseUser.profile, heightCm: 178 },
    },
  });
  assert.deepEqual(view.athlete.fields, [{ label: "Height", value: "178 cm" }]);
}

function testMapsAthleteFieldsAndAge() {
  const now = new Date("2026-08-15T00:00:00.000Z");
  const view = mapUserToProfileView(
    {
      user: {
        ...baseUser,
        profile: {
          name: "Ada",
          email: "ada@example.com",
          birthDate: new Date("1991-08-15T00:00:00.000Z"),
          heightCm: 178,
          weightKg: 67.5,
          current5kTime: 1680,
          longestRunKm: 12,
        },
      },
    },
    now,
  );
  const byLabel = Object.fromEntries(
    view.athlete.fields.map((field) => [field.label, field.value]),
  );
  assert.equal(byLabel["Height"], "178 cm");
  assert.equal(byLabel["Weight"], "67.5 kg");
  assert.equal(byLabel["Age"], "35");
  assert.equal(
    byLabel["Birth date"],
    formatActivityDate("1991-08-15T00:00:00.000Z"),
  );
  assert.equal(byLabel["Current 5K"], formatDuration(1680));
  assert.equal(byLabel["Longest run"], formatDistanceKm(12));
}

function testDoesNotAcceptCurrentPlanInput() {
  const view = mapUserToProfileView({ user: baseUser });
  assert.equal("currentPlan" in view, false);
}

function testDoesNotLeakStravaTokens() {
  const view = mapUserToProfileView({
    user: {
      ...baseUser,
      strava: {
        accessToken: "SECRET_ACCESS",
        refreshToken: "SECRET_REFRESH",
      },
    },
  });
  const json = JSON.stringify(view);
  assert.equal(json.includes("SECRET_ACCESS"), false);
  assert.equal(json.includes("SECRET_REFRESH"), false);
  assert.equal("strava" in view, false);
}

testMapsPresetGoalAndWeekTemplate();
testTreatsMissingStyleAsAdaptive();
testAdaptiveStyleHasNoPresetEvenWithGoal();
testNoGoalLeavesGoalNullAndSkipsPreset();
testOmitsUnsetAthleteFields();
testMapsAthleteFieldsAndAge();
testDoesNotAcceptCurrentPlanInput();
testDoesNotLeakStravaTokens();
console.log("getProfileView tests passed");
