import type { IActivity, IUserGoal, IUserProfile } from "@/models";
import type { TrainingStyle } from "@/lib/trainingStyle";

export type SnapshotUser = Pick<
  IUserProfile,
  "birthDate" | "heightCm" | "weightKg"
> & {
  goal?: IUserGoal;
  trainingStyle?: TrainingStyle;
};

export type SnapshotActivityInput = Pick<
  IActivity,
  | "type"
  | "startedAt"
  | "distanceKm"
  | "durationSeconds"
  | "paceSecondsPerKm"
  | "elevationGainMeters"
  | "heartRate"
  | "sufferScore"
  | "athleteFeedback"
>;
