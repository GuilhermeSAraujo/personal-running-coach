import mongoose, { type Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity, SessionPlan } from "@/models";
import { toPriorPlanSessions } from "@/services/ai/buildContinuityContext";
import { generateAthleteSnapshot } from "@/services/snapshot/generateAthleteSnapshot";

export type ConfirmMatchEntry = {
  activityId: string;
  sessionOrder: number | null;
};

export class ConfirmMatchesError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ConfirmMatchesError";
    this.status = status;
  }
}

export type ConfirmMatchesResult =
  | {
      ok: true;
      matchedCount: number;
      regenerated: boolean;
    }
  | {
      ok: false;
      matchesSaved: true;
      error: "plan_regen_failed";
      matchedCount: number;
    };

function isPlanOpen(status: string | undefined | null): boolean {
  return status == null || status === "open";
}

function isSessionOpen(status: string | undefined | null): boolean {
  return status == null || status === "open";
}

export async function confirmMatches(input: {
  userId: Types.ObjectId;
  sessionPlanId: string;
  matches: ConfirmMatchEntry[];
}): Promise<ConfirmMatchesResult> {
  await dbConnect();

  if (!mongoose.isValidObjectId(input.sessionPlanId)) {
    throw new ConfirmMatchesError("Invalid sessionPlanId", 400);
  }

  const plan = await SessionPlan.findOne({
    _id: input.sessionPlanId,
    userId: input.userId,
  });

  if (!plan || !isPlanOpen(plan.status)) {
    throw new ConfirmMatchesError(
      "Session plan is not open or was not found",
      409,
    );
  }

  const activityIds = input.matches.map((m) => m.activityId);
  if (new Set(activityIds).size !== activityIds.length) {
    throw new ConfirmMatchesError("Duplicate activity in matches", 400);
  }

  for (const id of activityIds) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ConfirmMatchesError("Invalid activityId", 400);
    }
  }

  const sessionOrders = input.matches
    .map((m) => m.sessionOrder)
    .filter((order): order is number => order != null);
  if (new Set(sessionOrders).size !== sessionOrders.length) {
    throw new ConfirmMatchesError("Duplicate session in matches", 400);
  }

  const objectIds = activityIds.map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length > 0) {
    const ownedCount = await Activity.countDocuments({
      userId: input.userId,
      _id: { $in: objectIds },
    });
    if (ownedCount !== objectIds.length) {
      throw new ConfirmMatchesError(
        "One or more activities were not found",
        400,
      );
    }
  }

  const alreadyLinked = await SessionPlan.findOne({
    userId: input.userId,
    "sessions.activityId": { $in: objectIds },
  })
    .select("_id")
    .lean();

  if (alreadyLinked && objectIds.length > 0) {
    throw new ConfirmMatchesError(
      "Activity is already linked to another session",
      409,
    );
  }

  const matchedAt = new Date();
  let matchedCount = 0;

  for (const entry of input.matches) {
    if (entry.sessionOrder == null) continue;

    const session = plan.sessions.find((s) => s.order === entry.sessionOrder);
    if (!session) {
      throw new ConfirmMatchesError(
        `Session order ${entry.sessionOrder} not found`,
        400,
      );
    }
    if (!isSessionOpen(session.status)) {
      throw new ConfirmMatchesError(
        `Session order ${entry.sessionOrder} is not open`,
        409,
      );
    }
    if (session.activityId) {
      throw new ConfirmMatchesError(
        `Session order ${entry.sessionOrder} is already matched`,
        409,
      );
    }
    if (session.type === "rest") {
      throw new ConfirmMatchesError(
        "Cannot match an activity to a rest day",
        400,
      );
    }

    session.status = "matched";
    session.activityId = new mongoose.Types.ObjectId(entry.activityId);
    session.matchedAt = matchedAt;
    matchedCount += 1;
  }

  if (matchedCount >= 1) {
    plan.status = "superseded";
  }

  await plan.save();

  if (matchedCount === 0) {
    return { ok: true, matchedCount: 0, regenerated: false };
  }

  try {
    await generateAthleteSnapshot(input.userId, {
      priorPlan: { sessions: toPriorPlanSessions(plan.sessions) },
    });
  } catch (error) {
    console.error("Failed to regenerate plan after matches:", error);
    return {
      ok: false,
      matchesSaved: true,
      error: "plan_regen_failed",
      matchedCount,
    };
  }

  const newerOpen = await SessionPlan.findOne({
    userId: input.userId,
    status: "open",
    createdAt: { $gt: plan.createdAt },
  })
    .select("_id")
    .lean();

  if (!newerOpen) {
    return {
      ok: false,
      matchesSaved: true,
      error: "plan_regen_failed",
      matchedCount,
    };
  }

  return { ok: true, matchedCount, regenerated: true };
}

export async function regenerateSessionPlanForUser(
  userId: Types.ObjectId,
): Promise<void> {
  await dbConnect();

  const prior = await SessionPlan.findOne({
    userId,
    status: "superseded",
  })
    .sort({ createdAt: -1 })
    .lean();

  await generateAthleteSnapshot(userId, {
    priorPlan: prior ? { sessions: toPriorPlanSessions(prior.sessions) } : null,
  });
}
