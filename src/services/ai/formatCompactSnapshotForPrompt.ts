import type {
  IAthleteSnapshot,
  IEstimatedEffort,
  IPersonalBestSet,
  ISnapshotActivity,
  IWeeklyTraining,
} from "@/models";
import type { PaceGuardrails } from "./paceGuards";
import { secondsPerKmToMinPerKm } from "./paceGuards";

export type CompactSnapshotInput = Omit<IAthleteSnapshot, "userId" | "createdAt">;

const RECENT_WEEKS_LIMIT = 4;
const RECENT_ACTIVITIES_LIMIT = 8;

const WEEKDAY_SHORT: Record<string, string> = {
  sunday: "sun",
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
};

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function formatKm(n: number): string {
  return String(round(n, 1));
}

function formatPaceMinPerKm(secondsPerKm: number): string {
  return String(round(secondsPerKmToMinPerKm(secondsPerKm), 2));
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Seconds → `M:SS` or `H:MM:SS`. */
export function formatClockDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  }
  return `${minutes}:${pad2(seconds)}`;
}

function formatDateYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatAthlete(snapshot: CompactSnapshotInput): string {
  const { profile, historicalPerformance } = snapshot;
  const lines = ["ATHLETE"];
  if (profile.ageYears != null) lines.push(`age=${profile.ageYears}`);
  if (profile.weightKg != null) lines.push(`weight=${round(profile.weightKg, 1)}`);
  if (profile.heightCm != null) lines.push(`height=${Math.round(profile.heightCm)}`);
  // lines.push(`lifetimeRuns=${historicalPerformance.lifetimeRuns}`);
  // lines.push(
  //   `lifetimeDistance=${formatKm(historicalPerformance.lifetimeDistanceKm)}km`,
  // );
  return lines.join("\n");
}

function formatGoal(snapshot: CompactSnapshotInput): string | null {
  const goal = snapshot.goal;
  if (!goal) return null;
  return [
    "GOAL",
    `type=${goal.type}`,
    `distance=${formatKm(goal.distanceKm)}km`,
    `targetTime=${formatClockDuration(goal.targetTimeSeconds)}`,
    `targetDate=${formatDateYmd(goal.targetDate)}`,
    `weeksRemaining=${goal.weeksUntilTarget}`,
  ].join("\n");
}

function formatCurrentState(snapshot: CompactSnapshotInput): string {
  const s = snapshot.currentState;
  const hrPct =
    s.heartRateCoverage <= 1
      ? Math.round(s.heartRateCoverage * 100)
      : Math.round(s.heartRateCoverage);

  const lines = [
    "CURRENT_STATE",
    `weeklyVolume.avg12w=${formatKm(s.weeklyVolumeKm.average12w)}km`,
    `weeklyVolume.avg4w=${formatKm(s.weeklyVolumeKm.average4w)}km`,
    `weeklyVolume.currentWeek=${formatKm(s.weeklyVolumeKm.currentWeek)}km`,
    `runsPerWeek.avg12w=${round(s.frequency.averageRunsPerWeek12w, 1)}`,
    `runsPerWeek.avg4w=${round(s.frequency.averageRunsPerWeek4w, 1)}`,
    `longRun.current=${formatKm(s.longRun.currentLongestKm)}km`,
    `longRun.avg12w=${formatKm(s.longRun.averageKm12w)}km`,
    `consistency=${s.consistency.weeksWithAtLeast3Runs}/${s.consistency.totalWeeks} weeks with >=3 runs`,
    `volumeTrend=${s.trends.volume}`,
  ];
  if (s.trends.pace) lines.push(`paceTrend=${s.trends.pace}`);
  if (s.trends.heartRate) lines.push(`hrTrend=${s.trends.heartRate}`);
  lines.push(`hrCoverage=${hrPct}%`);
  return lines.join("\n");
}

const PB_KEYS: Array<{
  key: keyof IPersonalBestSet;
  label: string;
}> = [
  { key: "1k", label: "PB1k" },
  { key: "3k", label: "PB3k" },
  { key: "5k", label: "PB5k" },
  { key: "10k", label: "PB10k" },
  { key: "halfMarathon", label: "PBhalf" },
  { key: "marathon", label: "PBmarathon" },
];

function formatEffortLine(label: string, effort: IEstimatedEffort): string {
  const parts = [
    `${label}=${formatClockDuration(effort.estimatedTimeSeconds)}`,
  ];
  if (effort.actualDistanceKm != null) {
    parts.push(`(${formatKm(effort.actualDistanceKm)}km)`);
  }
  if (effort.averageHeartRate != null) {
    parts.push(`HR=${Math.round(effort.averageHeartRate)}`);
  }
  return parts.join(" ");
}

function formatPerformance(snapshot: CompactSnapshotInput): string {
  const lines = ["PERFORMANCE"];
  const pbs = snapshot.historicalPerformance.personalBests;
  for (const { key, label } of PB_KEYS) {
    const effort = pbs[key];
    if (effort) lines.push(formatEffortLine(label, effort));
  }

  const longest =
    snapshot.historicalPerformance.longestRun ??
    snapshot.recentTraining.longestRun;
  if (longest) {
    lines.push(
      `longest=${formatKm(longest.distanceKm)}km (${formatClockDuration(longest.durationSeconds)}, ${formatPaceMinPerKm(longest.paceSecondsPerKm)}/km)`,
    );
  }

  // const recent5k = snapshot.recentTraining.bestEfforts["5k"];
  // if (recent5k?.averageHeartRate != null) {
  //   lines.push(`recent5kHR=${Math.round(recent5k.averageHeartRate)}`);
  // }
  // const recent10k = snapshot.recentTraining.bestEfforts["10k"];
  // if (recent10k?.averageHeartRate != null) {
  //   lines.push(`recent10kHR=${Math.round(recent10k.averageHeartRate)}`);
  // }

  return lines.join("\n");
}

function formatWeekLine(week: IWeeklyTraining): string {
  if (week.runs === 0) {
    return `${formatDateYmd(week.weekStart)} runs=0`;
  }
  const parts = [
    formatDateYmd(week.weekStart),
    `runs=${week.runs}`,
    `km=${formatKm(week.distanceKm)}`,
    `long=${formatKm(week.longestRunKm)}`,
  ];
  if (week.averagePaceSecondsPerKm != null) {
    parts.push(`pace=${formatPaceMinPerKm(week.averagePaceSecondsPerKm)}/km`);
  }
  if (week.elevationGainMeters > 0) {
    parts.push(`elev=${Math.round(week.elevationGainMeters)}`);
  }
  if (week.averageHeartRate != null) {
    parts.push(`HR=${Math.round(week.averageHeartRate)}`);
  }
  if (week.totalSufferScore != null) {
    parts.push(`suffer=${Math.round(week.totalSufferScore)}`);
  }
  if (week.walkDistanceKm > 0) {
    parts.push(`walk=${formatKm(week.walkDistanceKm)}km`);
  }
  return parts.join(" ");
}

function formatRecentWeeks(snapshot: CompactSnapshotInput): string {
  const weeks = snapshot.recentTraining.weeks;
  const recent = weeks.slice(-RECENT_WEEKS_LIMIT);
  return ["RECENT_WEEKS", ...recent.map(formatWeekLine)].join("\n");
}

function formatActivityLine(activity: ISnapshotActivity): string {
  const parts = [
    formatDateYmd(activity.date),
    `${formatKm(activity.distanceKm)}km`,
    `${formatPaceMinPerKm(activity.paceSecondsPerKm)}/km`,
  ];
  if (activity.averageHeartRate != null) {
    parts.push(`HR=${Math.round(activity.averageHeartRate)}`);
  }
  if (activity.sufferScore != null) {
    parts.push(`suffer=${Math.round(activity.sufferScore)}`);
  }
  if (activity.athleteFeedback?.effort) {
    parts.push(`effort=${activity.athleteFeedback.effort}`);
  }
  if (activity.athleteFeedback?.notes) {
    parts.push(`notes=${activity.athleteFeedback.notes}`);
  }
  return parts.join(" ");
}

function formatRecentActivities(snapshot: CompactSnapshotInput): string {
  const activities = snapshot.recentTraining.recentActivities.slice(
    0,
    RECENT_ACTIVITIES_LIMIT,
  );
  return [
    "RECENT_ACTIVITIES",
    ...activities.map(formatActivityLine),
  ].join("\n");
}

function formatPaceRules(guards: PaceGuardrails): string {
  return [
    "PACE_RULES",
    `anchor(${guards.source})=${guards.bestEffortMinPerKm}min/km`,
    `easyRecoveryLong.min=${guards.easyFloorMinPerKm}`,
    `work.min=${guards.workFloorMinPerKm}`,
    "doNotInventRacePace=true",
    "planPacesAreMinPerKmDecimals",
  ].join("\n");
}

function formatTrainingStyle(snapshot: CompactSnapshotInput): string {
  if (snapshot.trainingStyle === "preset" && snapshot.trainingPreset) {
    const preset = snapshot.trainingPreset;
    const dayLines = (
      [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ] as const
    ).map((day) => `${WEEKDAY_SHORT[day]}=${preset.weekTemplate[day]}`);

    const lines = [
      "TRAINING_PRESET",
      `id=${preset.id}`,
      ...dayLines,
    ];
    if (preset.rules.length > 0) {
      lines.push("PRESET_RULES");
      for (const rule of preset.rules) {
        lines.push(`- ${rule}`);
      }
    }
    return lines.join("\n");
  }

  return [
    "TRAINING_STYLE=adaptive",
    "no fixed weekday template; structure the week from CURRENT_STATE, RECENT_*, GOAL, and feedback",
  ].join("\n");
}

/**
 * Compact labeled-text athlete context for the LLM.
 * Single representation: store on AthleteSnapshot.promptText and send once.
 */
export function formatCompactSnapshotForPrompt(
  snapshot: CompactSnapshotInput,
  paceGuards: PaceGuardrails | null,
): string {
  const parts: Array<string | null> = [
    formatAthlete(snapshot),
    formatGoal(snapshot),
    formatCurrentState(snapshot),
    formatPerformance(snapshot),
    formatRecentWeeks(snapshot),
    formatRecentActivities(snapshot),
  ];

  if (paceGuards) {
    parts.push(formatPaceRules(paceGuards));
  }

  parts.push(formatTrainingStyle(snapshot));

  return parts.filter((p): p is string => p != null).join("\n\n");
}
