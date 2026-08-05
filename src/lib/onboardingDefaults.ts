import { GOAL_DISTANCE_KM, type GoalType } from "@/lib/goal"

export const DEFAULT_TARGET_TIME_SECONDS: Record<GoalType, number> = {
  "5k": 1800,
  "10k": 3600,
  half_marathon: 8100,
  marathon: 16200,
}

export const DEFAULT_PREP_MONTHS: Record<GoalType, number> = {
  "5k": 3,
  "10k": 3,
  half_marathon: 4,
  marathon: 5,
}

export interface ResolveGoalFieldsInput {
  targetTimeSeconds?: number
  targetDate?: string | Date
}

export interface ResolvedGoalFields {
  type: GoalType
  distanceKm: number
  targetTimeSeconds: number
  targetDate: Date
}

function addMonths(from: Date, months: number): Date {
  const date = new Date(from.getTime())
  const day = date.getDate()
  date.setMonth(date.getMonth() + months)
  // Clamp overflow (e.g. Jan 31 + 1 month)
  if (date.getDate() < day) {
    date.setDate(0)
  }
  return date
}

function parseTargetDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function resolveGoalFields(
  type: GoalType,
  input?: ResolveGoalFieldsInput,
  now: Date = new Date(),
): ResolvedGoalFields {
  const targetTimeSeconds =
    input?.targetTimeSeconds != null && Number.isFinite(input.targetTimeSeconds)
      ? input.targetTimeSeconds
      : DEFAULT_TARGET_TIME_SECONDS[type]

  let targetDate: Date
  if (input?.targetDate != null) {
    const parsed = parseTargetDate(input.targetDate)
    targetDate = parsed ?? addMonths(now, DEFAULT_PREP_MONTHS[type])
  } else {
    targetDate = addMonths(now, DEFAULT_PREP_MONTHS[type])
  }

  return {
    type,
    distanceKm: GOAL_DISTANCE_KM[type],
    targetTimeSeconds,
    targetDate,
  }
}

export function formatDurationLabel(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}
