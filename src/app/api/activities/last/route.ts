import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models";
import {
  LastActivityNotFoundError,
  resetLastActivity,
} from "@/services/activities/resetLastActivity";

export async function DELETE() {
  const session = await auth();
  if (!session?.stravaAthleteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const result = await resetLastActivity(user._id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof LastActivityNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("Delete last activity failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
