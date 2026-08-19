import {
  formatActivityDate,
  formatDistanceKm,
  formatDuration,
} from "@/lib/activityFormat";
import { GOAL_LABELS } from "@/lib/goal";
import {
  getTrainingPreset,
  type WeekdayKey,
  type WeekdayRole,
} from "@/lib/trainingPresets";
import type { TrainingStyle } from "@/lib/trainingStyle";
import { dbConnect } from "@/lib/db";
import { User } from "@/models";
import type { Types } from "mongoose";
import type {
  ProfileAthleteField,
  ProfileGoalView,
  ProfilePresetView,
  ProfileUserInput,
  ProfileView,
  ProfileWeekdayView,
} from "./types";

const WEEKDAY_ORDER: WeekdayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const ROLE_LABELS: Record<WeekdayRole, string> = {
  long_run: "Long run",
  easy: "Easy",
  intervals: "Intervals",
  tempo: "Tempo",
  recovery: "Recovery",
  rest: "Rest",
  strength_or_rest: "Strength / rest",
  quality: "Quality",
  quality_or_easy: "Quality or easy",
  easy_or_rest: "Easy or rest",
  rest_or_easy: "Rest or easy",
  free: "Free",
};

function ageYearsAt(birthDate: Date, now: Date): number {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const month = now.getUTCMonth() - birthDate.getUTCMonth();
  if (
    month < 0 ||
    (month === 0 && now.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

function mapGoal(user: ProfileUserInput): ProfileGoalView | null {
  if (!user.goal) return null;
  const targetDate = user.goal.targetDate.toISOString();
  return {
    type: user.goal.type,
    typeLabel: GOAL_LABELS[user.goal.type],
    distanceKm: user.goal.distanceKm,
    distanceLabel: formatDistanceKm(user.goal.distanceKm),
    targetTimeSeconds: user.goal.targetTimeSeconds,
    targetTimeLabel: formatDuration(user.goal.targetTimeSeconds),
    targetDate,
    targetDateLabel: formatActivityDate(targetDate),
  };
}

function mapPreset(user: ProfileUserInput): ProfilePresetView | null {
  if (user.trainingStyle !== "preset" || !user.goal) return null;
  const preset = getTrainingPreset(user.goal.type);
  const weekTemplate: ProfileWeekdayView[] = WEEKDAY_ORDER.map((weekday) => {
    const role = preset.weekTemplate[weekday];
    return {
      weekday,
      weekdayLabel: WEEKDAY_LABELS[weekday],
      role,
      roleLabel: ROLE_LABELS[role],
    };
  });
  return {
    id: preset.id,
    name: preset.name,
    summary: preset.summary,
    philosophy: preset.philosophy,
    weekTemplate,
    rules: [...preset.rules],
  };
}

function mapAthlete(
  user: ProfileUserInput,
  now: Date,
): ProfileAthleteField[] {
  const fields: ProfileAthleteField[] = [];
  const { profile } = user;
  if (profile.heightCm != null) {
    fields.push({ label: "Height", value: `${Math.round(profile.heightCm)} cm` });
  }
  if (profile.weightKg != null) {
    fields.push({ label: "Weight", value: `${profile.weightKg} kg` });
  }
  if (profile.birthDate) {
    fields.push({ label: "Age", value: String(ageYearsAt(profile.birthDate, now)) });
    const iso = profile.birthDate.toISOString();
    fields.push({
      label: "Birth date",
      value: formatActivityDate(iso),
    });
  }
  if (profile.current5kTime != null) {
    fields.push({
      label: "Current 5K",
      value: formatDuration(profile.current5kTime),
    });
  }
  if (profile.longestRunKm != null) {
    fields.push({
      label: "Longest run",
      value: formatDistanceKm(profile.longestRunKm),
    });
  }
  return fields;
}

export function mapUserToProfileView(
  input: { user: ProfileUserInput },
  now: Date = new Date(),
): ProfileView {
  const style: TrainingStyle = input.user.trainingStyle ?? "adaptive";
  const memberSince = input.user.createdAt.toISOString();
  return {
    name: input.user.profile.name,
    email: input.user.profile.email,
    memberSince,
    memberSinceLabel: formatActivityDate(memberSince),
    goal: mapGoal(input.user),
    trainingMethod: {
      style,
      styleLabel: style === "preset" ? "Structured preset" : "Adaptive",
      preset: mapPreset(input.user),
    },
    athlete: { fields: mapAthlete(input.user, now) },
  };
}

const USER_PROFILE_SELECT =
  "profile goal trainingStyle createdAt" as const;

export async function getProfileView(
  userId: Types.ObjectId | string,
  now: Date = new Date(),
): Promise<ProfileView | null> {
  await dbConnect();
  const user = await User.findById(userId)
    .select(USER_PROFILE_SELECT)
    .lean<ProfileUserInput | null>();
  if (!user) return null;

  return mapUserToProfileView({ user }, now);
}
