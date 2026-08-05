export {
  ACTIVITY_SOURCES,
  ACTIVITY_TYPES,
  GOAL_DISTANCE_KM,
  GOAL_TYPES,
  TRAINING_PLAN_STATUSES,
  WORKOUT_STATUSES,
  WORKOUT_TYPES,
  athleteMetricsSchema,
  estimatedRaceTimesSchema,
  heartRateSchema,
  type ActivitySource,
  type ActivityType,
  type GoalType,
  type IAthleteMetrics,
  type IEstimatedRaceTimes,
  type IHeartRate,
  type TrainingPlanStatus,
  type WorkoutStatus,
  type WorkoutType,
} from "./shared";

export {
  User,
  type IUser,
  type IUserCoaching,
  type IUserGoal,
  type IUserProfile,
  type IUserStrava,
  type UserDocument,
} from "./User";

export {
  Activity,
  type ActivityDocument,
  type IActivity,
  type IActivityTraining,
} from "./Activity";

export {
  Evaluation,
  type EvaluationDocument,
  type IEvaluation,
  type IEvaluationAnalysis,
  type IEvaluationPeriod,
  type IGoalAssessment,
} from "./Evaluation";

export {
  TrainingPlan,
  type ITrainingPlan,
  type TrainingPlanDocument,
} from "./TrainingPlan";

export {
  Workout,
  type IWorkout,
  type IWorkoutTarget,
  type WorkoutDocument,
} from "./Workout";
