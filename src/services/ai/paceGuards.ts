import type { AiPlannedSession, AiSessionSegment } from "./types";

/** Snapshot fields used to derive pace ceilings (min/km). */
export type PaceGuardSnapshot = {
  recentTraining?: {
    bestEfforts?: {
      "1k"?: { paceSecondsPerKm?: number };
      "3k"?: { paceSecondsPerKm?: number };
      "5k"?: { paceSecondsPerKm?: number };
      "10k"?: { paceSecondsPerKm?: number };
    };
    recentActivities?: Array<{ paceSecondsPerKm?: number }>;
  };
  historicalPerformance?: {
    personalBests?: {
      "1k"?: { paceSecondsPerKm?: number };
      "3k"?: { paceSecondsPerKm?: number };
      "5k"?: { paceSecondsPerKm?: number };
      "10k"?: { paceSecondsPerKm?: number };
    };
  };
};

export type PaceGuardrails = {
  /** Fastest allowed work-segment pace (min/km). Lower = faster — must not go below this. */
  workFloorMinPerKm: number;
  /** Slowest-allowed minimum for easy/recovery/long_run paces (min/km). Must be ≥ this. */
  easyFloorMinPerKm: number;
  /** Best effort used as anchor, min/km. */
  bestEffortMinPerKm: number;
  source: string;
};

const EASY_SESSION_TYPES = new Set(["easy", "recovery", "long_run"]);
const WORK_SEGMENT_KINDS = new Set(["work"]);

/** Work segments may not be more than 2% faster than estimated best effort. */
const WORK_VS_BEST_RATIO = 0.98;
/** Easy sessions must be at least 30% slower than best effort. */
const EASY_VS_BEST_RATIO = 1.3;
/** Prefer observed easy median, allow 8% faster than that median. */
const EASY_VS_OBSERVED_RATIO = 0.92;
/** Activity counts as "easy-ish" vs best if ≥ 15% slower. */
const EASYISH_VS_BEST_RATIO = 1.15;

export function secondsPerKmToMinPerKm(secondsPerKm: number): number {
  return secondsPerKm / 60;
}

function roundPace(minPerKm: number): number {
  return Math.round(minPerKm * 100) / 100;
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid];
}

function pickBestEffortSeconds(snapshot: PaceGuardSnapshot): {
  seconds: number;
  source: string;
} | null {
  const recent = snapshot.recentTraining?.bestEfforts ?? {};
  const pb = snapshot.historicalPerformance?.personalBests ?? {};
  const keys = ["5k", "3k", "10k", "1k"] as const;

  for (const key of keys) {
    const effort = recent[key] ?? pb[key];
    const pace = effort?.paceSecondsPerKm;
    if (typeof pace === "number" && pace > 0) {
      return { seconds: pace, source: key };
    }
  }

  const recentPaces = (snapshot.recentTraining?.recentActivities ?? [])
    .map((a) => a.paceSecondsPerKm)
    .filter((p): p is number => typeof p === "number" && p > 0);
  if (recentPaces.length === 0) return null;
  const fastest = Math.min(...recentPaces);
  return { seconds: fastest, source: "fastest_recent_activity" };
}

function pickObservedEasySeconds(
  snapshot: PaceGuardSnapshot,
  bestSeconds: number,
): number | undefined {
  const recentPaces = (snapshot.recentTraining?.recentActivities ?? [])
    .map((a) => a.paceSecondsPerKm)
    .filter((p): p is number => typeof p === "number" && p > 0);

  const easyish = recentPaces.filter(
    (p) => p >= bestSeconds * EASYISH_VS_BEST_RATIO,
  );
  const pool = easyish.length >= 2 ? easyish : recentPaces;
  return median(pool);
}

export function derivePaceGuardrails(
  snapshot: PaceGuardSnapshot,
): PaceGuardrails | null {
  const best = pickBestEffortSeconds(snapshot);
  if (!best) return null;

  const bestEffortMinPerKm = secondsPerKmToMinPerKm(best.seconds);
  const workFloorMinPerKm = roundPace(bestEffortMinPerKm * WORK_VS_BEST_RATIO);

  const observedEasySec = pickObservedEasySeconds(snapshot, best.seconds);
  const fromBest = bestEffortMinPerKm * EASY_VS_BEST_RATIO;
  const fromObserved =
    observedEasySec != null
      ? secondsPerKmToMinPerKm(observedEasySec) * EASY_VS_OBSERVED_RATIO
      : 0;
  const easyFloorMinPerKm = roundPace(Math.max(fromBest, fromObserved));

  return {
    workFloorMinPerKm,
    easyFloorMinPerKm,
    bestEffortMinPerKm: roundPace(bestEffortMinPerKm),
    source: best.source,
  };
}

function segmentPaces(segment: AiSessionSegment): number[] {
  const out: number[] = [];
  if (typeof segment.paceMinPerKm === "number") out.push(segment.paceMinPerKm);
  if (typeof segment.paceMaxPerKm === "number") out.push(segment.paceMaxPerKm);
  return out;
}

export function assertSessionsRespectPaceGuards(
  sessions: AiPlannedSession[],
  guards: PaceGuardrails,
): void {
  for (const session of sessions) {
    if (session.type === "rest") continue;

    const isEasySession = EASY_SESSION_TYPES.has(session.type);

    for (const [index, segment] of session.segments.entries()) {
      const paces = segmentPaces(segment);
      if (paces.length === 0) continue;

      const path = `session order ${session.order} segments[${index}]`;
      const fastestPrescribed = Math.min(...paces);

      if (isEasySession) {
        if (fastestPrescribed < guards.easyFloorMinPerKm) {
          throw new Error(
            `${path}: easy/recovery/long_run pace ${fastestPrescribed} min/km is faster than allowed floor ${guards.easyFloorMinPerKm} (from ${guards.source})`,
          );
        }
        continue;
      }

      if (WORK_SEGMENT_KINDS.has(segment.kind)) {
        if (fastestPrescribed < guards.workFloorMinPerKm) {
          throw new Error(
            `${path}: work pace ${fastestPrescribed} min/km is faster than allowed floor ${guards.workFloorMinPerKm} (from ${guards.source})`,
          );
        }
      }
    }
  }
}

export function formatPaceGuardsForPrompt(guards: PaceGuardrails): string {
  return [
    `Limites de ritmo derivados do snapshot (minutos por km decimais; NÃO use segundos/km no plano):`,
    `- Âncora (${guards.source}): ${guards.bestEffortMinPerKm} min/km.`,
    `- Sessões easy / recovery / long_run: todo paceMinPerKm e paceMaxPerKm deve ser ≥ ${guards.easyFloorMinPerKm}.`,
    `- Segmentos kind "work" (tempo/interval): paceMinPerKm e paceMaxPerKm devem ser ≥ ${guards.workFloorMinPerKm} (não mais rápido que ~o melhor esforço estimado).`,
    `- Não invente ritmo de prova. Easy do atleta é bem mais lento que o melhor 5k.`,
    `- Lembrete: 345 s/km no snapshot = 5.75 min/km no plano; 510 s/km = 8.5 min/km.`,
  ].join("\n");
}
