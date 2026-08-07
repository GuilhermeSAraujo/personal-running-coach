import type { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity, AthleteSnapshot, User } from "@/models";
import { generateNextSessions } from "@/services/ai/generateNextSessions";
import { buildAthleteSnapshot } from "./buildAthleteSnapshot";
import type { SnapshotActivityInput } from "./types";

const SNAPSHOT_SELECT =
  "type startedAt distanceKm durationSeconds paceSecondsPerKm elevationGainMeters heartRate sufferScore" as const;

export async function generateAthleteSnapshot(
  userId: Types.ObjectId,
): Promise<void> {
  await dbConnect();

  const user = await User.findById(userId)
    .select("profile.birthDate profile.heightCm profile.weightKg goal")
    .lean();

  if (!user) {
    throw new Error(`User not found: ${String(userId)}`);
  }

  const activities = await Activity.find({ userId })
    .select(SNAPSHOT_SELECT)
    .lean<SnapshotActivityInput[]>();

  const snapshot = buildAthleteSnapshot({
    user: {
      birthDate: user.profile?.birthDate,
      heightCm: user.profile?.heightCm,
      weightKg: user.profile?.weightKg,
      goal: user.goal,
    },
    activities,
    now: new Date(),
  });

  const created = await AthleteSnapshot.create({
    userId,
    ...snapshot,
  });

  try {
    await generateNextSessions({
      userId,
      athleteSnapshotId: created._id,
      snapshot,
    });
  } catch (error) {
    console.error("Failed to generate next sessions:", error);
  }
}
