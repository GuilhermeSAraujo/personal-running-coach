import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models";
import { regenerateSessionPlanForUser } from "@/services/matching/confirmMatches";

export async function POST() {
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

    await regenerateSessionPlanForUser(user._id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Session plan regenerate failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
