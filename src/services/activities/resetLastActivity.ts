import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import {
  Activity,
  AthleteSnapshot,
  DailyCoachMessage,
  SessionPlan,
} from "@/models";

export class LastActivityNotFoundError extends Error {
  constructor() {
    super("No activity to delete");
    this.name = "LastActivityNotFoundError";
  }
}

export type ResetActivityRef = {
  id: string;
  createdAt: Date;
};

export type ResetSnapshotRef = {
  id: string;
  createdAt: Date;
};

export type ResetPlanSessionRef = {
  order: number;
  activityId: string | null;
};

export type ResetSessionPlanRef = {
  id: string;
  createdAt: Date;
  status: string;
  sessions: ResetPlanSessionRef[];
};

export type LastActivityResetPlan = {
  activityId: string;
  snapshotIdsToDelete: string[];
  planIdsToDelete: string[];
  planIdToReopen: string | null;
  unmatches: { planId: string; sessionOrders: number[] }[];
};

function isCreatedAtOrAfter(createdAt: Date, importedAt: Date): boolean {
  return createdAt.getTime() >= importedAt.getTime();
}

export function planLastActivityReset(input: {
  activity: ResetActivityRef;
  snapshots: ResetSnapshotRef[];
  sessionPlans: ResetSessionPlanRef[];
}): LastActivityResetPlan {
  const snapshotIdsToDelete = input.snapshots
    .filter((snapshot) =>
      isCreatedAtOrAfter(snapshot.createdAt, input.activity.createdAt),
    )
    .map((snapshot) => snapshot.id);

  const planIdsToDelete = input.sessionPlans
    .filter((sessionPlan) =>
      isCreatedAtOrAfter(sessionPlan.createdAt, input.activity.createdAt),
    )
    .map((sessionPlan) => sessionPlan.id);

  const deleting = new Set(planIdsToDelete);
  const remaining = input.sessionPlans.filter(
    (sessionPlan) => !deleting.has(sessionPlan.id),
  );
  const newestRemaining = remaining.reduce<ResetSessionPlanRef | null>(
    (latest, sessionPlan) => {
      if (!latest || sessionPlan.createdAt.getTime() > latest.createdAt.getTime()) {
        return sessionPlan;
      }
      return latest;
    },
    null,
  );

  const unmatches = remaining.flatMap((sessionPlan) => {
    const sessionOrders = sessionPlan.sessions
      .filter((session) => session.activityId === input.activity.id)
      .map((session) => session.order);
    if (sessionOrders.length === 0) return [];
    return [{ planId: sessionPlan.id, sessionOrders }];
  });

  return {
    activityId: input.activity.id,
    snapshotIdsToDelete,
    planIdsToDelete,
    planIdToReopen: newestRemaining?.id ?? null,
    unmatches,
  };
}

function toObjectIds(ids: string[]): Types.ObjectId[] {
  return ids.map((id) => new Types.ObjectId(id));
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function resetLastActivity(
  userId: Types.ObjectId | string,
  now = new Date(),
): Promise<{ activityId: string }> {
  await dbConnect();

  const last = await Activity.findOne({ userId }).sort({ startedAt: -1 });
  if (!last) {
    throw new LastActivityNotFoundError();
  }

  const [snapshots, sessionPlans] = await Promise.all([
    AthleteSnapshot.find({ userId }).select("_id createdAt").lean(),
    SessionPlan.find({ userId })
      .select("_id createdAt status sessions.order sessions.activityId")
      .lean(),
  ]);

  const plan = planLastActivityReset({
    activity: { id: String(last._id), createdAt: last.createdAt },
    snapshots: snapshots.map((doc) => ({
      id: String(doc._id),
      createdAt: doc.createdAt,
    })),
    sessionPlans: sessionPlans.map((doc) => ({
      id: String(doc._id),
      createdAt: doc.createdAt,
      status: doc.status,
      sessions: doc.sessions.map((session) => ({
        order: session.order,
        activityId: session.activityId ? String(session.activityId) : null,
      })),
    })),
  });

  for (const unmatch of plan.unmatches) {
    await SessionPlan.updateOne(
      { _id: unmatch.planId, userId },
      {
        $set: { "sessions.$[s].status": "open" },
        $unset: {
          "sessions.$[s].activityId": 1,
          "sessions.$[s].matchedAt": 1,
        },
      },
      { arrayFilters: [{ "s.activityId": last._id }] },
    );
  }

  if (plan.planIdsToDelete.length > 0) {
    await SessionPlan.deleteMany({
      userId,
      _id: { $in: toObjectIds(plan.planIdsToDelete) },
    });
  }

  if (plan.snapshotIdsToDelete.length > 0) {
    await AthleteSnapshot.deleteMany({
      userId,
      _id: { $in: toObjectIds(plan.snapshotIdsToDelete) },
    });
  }

  await Activity.deleteOne({ _id: last._id, userId });

  if (plan.planIdToReopen) {
    await SessionPlan.updateOne(
      { _id: plan.planIdToReopen, userId },
      { $set: { status: "open" } },
    );
  }

  await DailyCoachMessage.deleteOne({
    userId,
    date: toUtcDateString(now),
  });

  return { activityId: plan.activityId };
}
