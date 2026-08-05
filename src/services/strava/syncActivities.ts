import { dbConnect } from "@/lib/db";
import { Activity, User } from "@/models";
import { ensureUserAccessToken, listAthleteActivities } from "./client";
import { isRunOrWalk, mapSummaryToActivity } from "./mapActivity";

export class UserNotFoundError extends Error {
  constructor(athleteId: number) {
    super(`User not found for Strava athlete ${athleteId}`);
    this.name = "UserNotFoundError";
  }
}

export interface SyncActivitiesResult {
  fetched: number;
  upserted: number;
  skipped: number;
}

const PER_PAGE = 200;

export async function syncActivitiesForAthlete(
  athleteId: number,
): Promise<SyncActivitiesResult> {
  await dbConnect();

  const user = await User.findOne({ "strava.athleteId": athleteId });
  if (!user) {
    throw new UserNotFoundError(athleteId);
  }

  const accessToken = await ensureUserAccessToken(user);

  const newest = await Activity.findOne({ userId: user._id })
    .sort({ startedAt: -1 })
    .select("startedAt")
    .lean();

  const after =
    newest?.startedAt != null
      ? Math.floor(newest.startedAt.getTime() / 1000)
      : undefined;

  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  let page = 1;

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

  return { fetched, upserted, skipped };
}
