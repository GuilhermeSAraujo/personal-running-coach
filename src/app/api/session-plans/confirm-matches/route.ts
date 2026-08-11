import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { ATHLETE_EFFORTS, User, type AthleteEffort } from "@/models";
import {
  ConfirmMatchesError,
  confirmMatches,
  type ConfirmMatchEntry,
} from "@/services/matching/confirmMatches";

type ConfirmBody = {
  sessionPlanId?: unknown;
  matches?: unknown;
};

function parseMatches(value: unknown): ConfirmMatchEntry[] | null {
  if (!Array.isArray(value)) return null;
  const matches: ConfirmMatchEntry[] = [];
  for (const item of value) {
    if (item == null || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    if (typeof record.activityId !== "string" || !record.activityId) {
      return null;
    }

    let sessionOrder: number | null;
    if (record.sessionOrder === null) {
      sessionOrder = null;
    } else if (
      typeof record.sessionOrder === "number" &&
      Number.isInteger(record.sessionOrder)
    ) {
      sessionOrder = record.sessionOrder;
    } else {
      return null;
    }

    const entry: ConfirmMatchEntry = {
      activityId: record.activityId,
      sessionOrder,
    };

    if (record.effort !== undefined) {
      if (
        typeof record.effort !== "string" ||
        !(ATHLETE_EFFORTS as readonly string[]).includes(record.effort)
      ) {
        return null;
      }
      entry.effort = record.effort as AthleteEffort;
    }

    if (record.notes !== undefined) {
      if (typeof record.notes !== "string") return null;
      entry.notes = record.notes;
    }

    matches.push(entry);
  }
  return matches;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.stravaAthleteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.sessionPlanId !== "string" || !body.sessionPlanId) {
    return NextResponse.json(
      { error: "sessionPlanId is required" },
      { status: 400 },
    );
  }

  const matches = parseMatches(body.matches);
  if (!matches) {
    return NextResponse.json(
      {
        error:
          "matches must be an array of { activityId, sessionOrder, effort?, notes? }",
      },
      { status: 400 },
    );
  }

  try {
    await dbConnect();
    const user = await User.findOne({
      "strava.athleteId": session.stravaAthleteId,
    })
      .select("_id")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await confirmMatches({
      userId: user._id,
      sessionPlanId: body.sessionPlanId,
      matches,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ConfirmMatchesError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Confirm matches failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
