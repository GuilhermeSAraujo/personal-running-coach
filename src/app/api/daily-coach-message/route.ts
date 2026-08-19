import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models";
import { ensureDailyCoachMessage } from "@/services/coachMessages/ensureDailyCoachMessage";

export const maxDuration = 60;

async function handleDailyCoachMessage(force: boolean) {
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

    const result = await ensureDailyCoachMessage(user._id, { force });
    if (!result) {
      return NextResponse.json({ message: null });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Daily coach message failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return handleDailyCoachMessage(false);
}

export async function POST() {
  return handleDailyCoachMessage(true);
}
