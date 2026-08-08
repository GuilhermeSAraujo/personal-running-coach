import type { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity, AthleteSnapshot, SessionPlan, User } from "@/models";
import type { IPlannedSession } from "@/models/SessionPlan";
import { generateAthleteSnapshot } from "@/services/snapshot/generateAthleteSnapshot";
import { suggestMatches } from "@/services/matching/suggestMatches";
import type {
  ActivityForMatch,
  MatchSuggestion,
  SessionForMatch,
  SyncActivitySummary,
  SyncOpenSessionSummary,
} from "@/services/matching/types";
import { backfillSufferScoreFromRaw } from "./backfillSufferScore";
import { ensureUserAccessToken, listAthleteActivities } from "./client";
import { isRunOrWalk, mapSummaryToActivity } from "./mapActivity";

export class UserNotFoundError extends Error {
  constructor(athleteId: number) {
    super(`User not found for Strava athlete ${athleteId}`);
    this.name = "UserNotFoundError";
  }
}

export type { SyncActivitySummary, SyncOpenSessionSummary };

export type SyncActivitiesResult =
  | {
      phase: "done";
      fetched: number;
      upserted: number;
      skipped: number;
    }
  | {
      phase: "match";
      fetched: number;
      upserted: number;
      skipped: number;
      sessionPlanId: string;
      activities: SyncActivitySummary[];
      sessions: SyncOpenSessionSummary[];
      suggestions: MatchSuggestion[];
    };

const PER_PAGE = 200;

function isSessionOpen(session: IPlannedSession): boolean {
  return session.status == null || session.status === "open";
}

function toSessionForMatch(session: IPlannedSession): SessionForMatch {
  return {
    order: session.order,
    title: session.title,
    type: session.type,
    totalDistanceKmMin: session.totalDistanceKmMin,
    totalDistanceKmMax: session.totalDistanceKmMax,
    segments: session.segments ?? [],
  };
}

async function findOpenSessionPlan(userId: Types.ObjectId) {
  return SessionPlan.findOne({
    userId,
    $or: [{ status: "open" }, { status: { $exists: false } }],
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function syncActivitiesForAthlete(
  athleteId: number,
): Promise<SyncActivitiesResult> {
  await dbConnect();

  console.log("Backfilling suffer score from raw...");
  const backfilled = await backfillSufferScoreFromRaw();
  console.log(`Backfilled ${backfilled} activities`);

  const user = await User.findOne({ "strava.athleteId": athleteId });
  if (!user) {
    throw new UserNotFoundError(athleteId);
  }

  const accessToken = await ensureUserAccessToken(user);

  const newest = await Activity.findOne({ userId: user._id })
    .sort({ startedAt: -1 })
    .select("startedAt")
    .lean();

  const hadActivitiesBefore = newest != null;

  const after =
    newest?.startedAt != null
      ? Math.floor(newest.startedAt.getTime() / 1000)
      : undefined;

  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  let page = 1;
  const syncedStravaIds: number[] = [];

  while (true) {
    const activities = await listAthleteActivities({
      accessToken,
      page,
      perPage: PER_PAGE,
      after,
    });

    if (activities.length === 0) {
      break;
    }

    fetched += activities.length;

    const ops = [];
    for (const activity of activities) {
      if (!isRunOrWalk(activity)) {
        skipped += 1;
        continue;
      }

      const mapped = mapSummaryToActivity(user._id, activity);
      syncedStravaIds.push(mapped.stravaActivityId);
      ops.push({
        updateOne: {
          filter: {
            userId: user._id,
            stravaActivityId: mapped.stravaActivityId,
          },
          update: { $set: mapped },
          upsert: true,
        },
      });
    }

    if (ops.length > 0) {
      await Activity.bulkWrite(ops);
      upserted += ops.length;
    }

    page += 1;
  }

  const openPlan = await findOpenSessionPlan(user._id);
  const openSessions = (openPlan?.sessions ?? []).filter(
    (s) => isSessionOpen(s) && s.type !== "rest",
  );
  const needsMatchPhase =
    hadActivitiesBefore &&
    upserted > 0 &&
    openPlan != null &&
    openSessions.length > 0;

  if (needsMatchPhase && openPlan) {
    const activityDocs = await Activity.find({
      userId: user._id,
      stravaActivityId: { $in: syncedStravaIds },
    })
      .select(
        "_id startedAt distanceKm durationSeconds paceSecondsPerKm type heartRate",
      )
      .sort({ startedAt: 1 })
      .lean();

    const activitiesForMatch: ActivityForMatch[] = activityDocs.map((doc) => ({
      id: String(doc._id),
      startedAt: doc.startedAt,
      distanceKm: doc.distanceKm,
      durationSeconds: doc.durationSeconds,
      paceSecondsPerKm: doc.paceSecondsPerKm,
      ...(doc.heartRate?.average != null
        ? { heartRateAvg: doc.heartRate.average }
        : {}),
    }));

    const sessionsForMatch = openSessions.map(toSessionForMatch);
    const suggestions = suggestMatches(activitiesForMatch, sessionsForMatch);

    return {
      phase: "match",
      fetched,
      upserted,
      skipped,
      sessionPlanId: String(openPlan._id),
      activities: activityDocs.map((doc) => ({
        id: String(doc._id),
        startedAt: doc.startedAt.toISOString(),
        distanceKm: doc.distanceKm,
        durationSeconds: doc.durationSeconds,
        paceSecondsPerKm: doc.paceSecondsPerKm,
        type: doc.type,
      })),
      sessions: openSessions
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          order: s.order,
          title: s.title,
          type: s.type,
          scheduledDate: s.scheduledDate,
        })),
      suggestions,
    };
  }

  const needsSnapshot =
    upserted > 0 ||
    !(await AthleteSnapshot.exists({ userId: user._id }));

  if (needsSnapshot) {
    try {
      await generateAthleteSnapshot(user._id);
    } catch (error) {
      console.error("Failed to generate athlete snapshot:", error);
    }
  }

  return { phase: "done", fetched, upserted, skipped };
}
