import type { GoalType } from "@/lib/goal";
import type { WeekdayKey, WeekdayRole } from "@/lib/trainingPresets";
import type { TrainingStyle } from "@/lib/trainingStyle";
import type { TrainingPlanStatus } from "@/models";

export type ProfileGoalView = {
  type: GoalType;
  typeLabel: string;
  distanceKm: number;
  distanceLabel: string;
  targetTimeSeconds: number;
  targetTimeLabel: string;
  targetDate: string;
  targetDateLabel: string;
};

export type ProfileWeekdayView = {
  weekday: WeekdayKey;
  weekdayLabel: string;
  role: WeekdayRole;
  roleLabel: string;
};

export type ProfilePresetView = {
  id: string;
  name: string;
  summary: string;
  philosophy: string;
  weekTemplate: ProfileWeekdayView[];
  rules: string[];
};

export type ProfileTrainingMethodView = {
  style: TrainingStyle;
  styleLabel: string;
  preset: ProfilePresetView | null;
};

export type ProfileAthleteField = {
  label: string;
  value: string;
};

export type ProfileAthleteView = {
  fields: ProfileAthleteField[];
};

export type ProfileCurrentPlanView = {
  objective: string;
  status: TrainingPlanStatus;
  statusLabel: string;
  startDate: string;
  startDateLabel: string;
  endDate: string;
  endDateLabel: string;
};

export type ProfileView = {
  name: string;
  email: string;
  memberSince: string;
  memberSinceLabel: string;
  goal: ProfileGoalView | null;
  trainingMethod: ProfileTrainingMethodView;
  athlete: ProfileAthleteView;
  currentPlan: ProfileCurrentPlanView | null;
};

export type ProfileUserInput = {
  profile: {
    name: string;
    email: string;
    birthDate?: Date;
    heightCm?: number;
    weightKg?: number;
    current5kTime?: number;
    longestRunKm?: number;
  };
  goal?: {
    type: GoalType;
    distanceKm: number;
    targetTimeSeconds: number;
    targetDate: Date;
  };
  trainingStyle?: TrainingStyle;
  createdAt: Date;
  strava?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

export type ProfilePlanInput = {
  objective: string;
  status: TrainingPlanStatus;
  startDate: Date;
  endDate: Date;
};
