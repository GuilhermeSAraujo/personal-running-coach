import type { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity, AthleteSnapshot, User } from "@/models";
import type { ContinuityPlanSession } from "@/services/ai/buildContinuityContext";
import { generateNextSessions } from "@/services/ai/generateNextSessions";
import { buildAthleteSnapshot } from "./buildAthleteSnapshot";
import type { SnapshotActivityInput } from "./types";

const SNAPSHOT_SELECT =
  "type startedAt distanceKm durationSeconds paceSecondsPerKm elevationGainMeters heartRate sufferScore athleteFeedback" as const;

export async function generateAthleteSnapshot(
  userId: Types.ObjectId,
  options?: { priorPlan?: { sessions: ContinuityPlanSession[] } | null },
): Promise<void> {
  await dbConnect();

  const user = await User.findById(userId)
    .select("profile.birthDate profile.heightCm profile.weightKg goal trainingStyle")
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
      trainingStyle: user.trainingStyle,
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
      priorPlan: options?.priorPlan ?? null,
    });
  } catch (error) {
    console.error("Failed to generate next sessions:", error);
  }
}
