export const GOAL_TYPES = [
  "5k",
  "10k",
  "half_marathon",
  "marathon",
] as const
export type GoalType = (typeof GOAL_TYPES)[number]

export const GOAL_DISTANCE_KM: Record<GoalType, number> = {
  "5k": 5,
  "10k": 10,
  half_marathon: 21.1,
  marathon: 42.195,
}
