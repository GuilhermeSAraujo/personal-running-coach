import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { StravaApiError } from "@/services/strava/types"
import {
  syncActivitiesForAthlete,
  UserNotFoundError,
} from "@/services/strava/syncActivities"

export async function POST() {
  const session = await auth()
  if (!session?.stravaAthleteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await syncActivitiesForAthlete(session.stravaAthleteId)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof StravaApiError) {
      if (err.status === 401 || err.status === 403) {
        return NextResponse.json(
          { error: "Strava authorization failed" },
          { status: 502 },
        )
      }
      return NextResponse.json(
        { error: "Strava request failed" },
        { status: 502 },
      )
    }
    console.error("Activity sync failed", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
