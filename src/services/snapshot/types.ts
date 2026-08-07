import type { IActivity, IUserGoal, IUserProfile } from "@/models";

export type SnapshotUser = Pick<
  IUserProfile,
  "birthDate" | "heightCm" | "weightKg"
> & { goal?: IUserGoal };

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
>;
