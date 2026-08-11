import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import { resolveGoalFields } from "@/lib/onboardingDefaults"
import { isTrainingStyle } from "@/lib/trainingStyle"
import { User } from "@/models"
import { GOAL_TYPES, type GoalType } from "@/lib/goal"

type ProfilePayload = {
  heightCm?: unknown
  weightKg?: unknown
  birthDate?: unknown
  current5kTime?: unknown
  longestRunKm?: unknown
}

type OnboardingBody = {
  goal?: {
    type?: unknown
    targetTimeSeconds?: unknown
    targetDate?: unknown
  }
  trainingStyle?: unknown
  profile?: ProfilePayload
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

function isGoalType(value: unknown): value is GoalType {
  return typeof value === "string" && (GOAL_TYPES as readonly string[]).includes(value)
}

function parseOptionalPositiveNumber(
  value: unknown,
  field: string,
): ParseResult<number | undefined> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: undefined }
  }
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: `Invalid ${field}` }
  }
  return { ok: true, value: n }
}

function parseOptionalDate(value: unknown, field: string): ParseResult<Date | undefined> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: undefined }
  }
  if (typeof value !== "string" && !(value instanceof Date)) {
    return { ok: false, error: `Invalid ${field}` }
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: `Invalid ${field}` }
  }
  return { ok: true, value: date }
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.stravaAthleteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: OnboardingBody
  try {
    body = (await request.json()) as OnboardingBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!isGoalType(body.goal?.type)) {
    return NextResponse.json({ error: "goal.type is required" }, { status: 400 })
  }

  if (!isTrainingStyle(body.trainingStyle)) {
    return NextResponse.json(
      { error: "trainingStyle is required (preset or adaptive)" },
      { status: 400 },
    )
  }
  const trainingStyle = body.trainingStyle

  const targetTimeSeconds = parseOptionalPositiveNumber(

    body.goal.targetTimeSeconds,
    "goal.targetTimeSeconds",
  )
  if (!targetTimeSeconds.ok) {
    return NextResponse.json({ error: targetTimeSeconds.error }, { status: 400 })
  }

  const targetDate = parseOptionalDate(body.goal.targetDate, "goal.targetDate")
  if (!targetDate.ok) {
    return NextResponse.json({ error: targetDate.error }, { status: 400 })
  }

  const profile = body.profile ?? {}
  const heightCm = parseOptionalPositiveNumber(profile.heightCm, "profile.heightCm")
  if (!heightCm.ok) {
    return NextResponse.json({ error: heightCm.error }, { status: 400 })
  }
  const weightKg = parseOptionalPositiveNumber(profile.weightKg, "profile.weightKg")
  if (!weightKg.ok) {
    return NextResponse.json({ error: weightKg.error }, { status: 400 })
  }
  const current5kTime = parseOptionalPositiveNumber(
    profile.current5kTime,
    "profile.current5kTime",
  )
  if (!current5kTime.ok) {
    return NextResponse.json({ error: current5kTime.error }, { status: 400 })
  }
  const longestRunKm = parseOptionalPositiveNumber(
    profile.longestRunKm,
    "profile.longestRunKm",
  )
  if (!longestRunKm.ok) {
    return NextResponse.json({ error: longestRunKm.error }, { status: 400 })
  }
  const birthDate = parseOptionalDate(profile.birthDate, "profile.birthDate")
  if (!birthDate.ok) {
    return NextResponse.json({ error: birthDate.error }, { status: 400 })
  }

  const goal = resolveGoalFields(body.goal.type, {
    targetTimeSeconds: targetTimeSeconds.value,
    targetDate: targetDate.value,
  })

  const $set: Record<string, unknown> = { goal, trainingStyle }
  if (heightCm.value != null) $set["profile.heightCm"] = heightCm.value
  if (weightKg.value != null) $set["profile.weightKg"] = weightKg.value
  if (current5kTime.value != null) $set["profile.current5kTime"] = current5kTime.value
  if (longestRunKm.value != null) $set["profile.longestRunKm"] = longestRunKm.value
  if (birthDate.value != null) $set["profile.birthDate"] = birthDate.value

  try {
    await dbConnect()
    const updated = await User.findOneAndUpdate(
      { "strava.athleteId": session.stravaAthleteId },
      { $set },
      { new: true },
    )

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Onboarding update failed", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
