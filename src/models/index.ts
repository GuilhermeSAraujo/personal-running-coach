export {
  ACTIVITY_SOURCES,
  ACTIVITY_TYPES,
  GOAL_DISTANCE_KM,
  GOAL_TYPES,
  SEGMENT_KINDS,
  SESSION_TYPES,
  heartRateSchema,
  type ActivitySource,
  type ActivityType,
  type GoalType,
  type IHeartRate,
  type SegmentKind,
  type SessionType,
} from "./shared";

export {
  User,
  TRAINING_STYLES,
  type IUser,
  type IUserGoal,
  type IUserProfile,
  type IUserStrava,
  type TrainingStyle,
  type UserDocument,
} from "./User";

export {
  ATHLETE_EFFORTS,
  ATHLETE_NOTES_MAX_LENGTH,
  Activity,
  type ActivityDocument,
  type AthleteEffort,
  type IActivity,
  type IActivityTraining,
  type IAthleteFeedback,
} from "./Activity";

export {
  ATHLETE_SNAPSHOT_SCHEMA_VERSION,
  AthleteSnapshot,
  type AthleteSnapshotDocument,
  type IAthleteSnapshot,
  type IAthleteSnapshotGoal,
  type IAthleteSnapshotProfile,
  type ICurrentState,
  type IEstimatedEffort,
  type IEstimatedEffortSet,
  type IPersonalBestSet,
  type ISnapshotActivity,
  type IWeeklyTraining,
} from "./AthleteSnapshot";

export {
  SESSION_PLAN_SCHEMA_VERSION,
  SESSION_PLAN_STATUSES,
  PLANNED_SESSION_STATUSES,
  SessionPlan,
  type IPlannedSession,
  type ISessionPlan,
  type ISessionSegment,
  type PlannedSessionStatus,
  type SessionPlanDocument,
  type SessionPlanStatus,
} from "./SessionPlan";

export {
  DAILY_COACH_MESSAGE_SCHEMA_VERSION,
  DailyCoachMessage,
  type DailyCoachMessageDocument,
  type IDailyCoachMessage,
} from "./DailyCoachMessage";
