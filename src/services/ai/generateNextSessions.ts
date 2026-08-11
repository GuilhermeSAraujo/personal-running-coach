import type { Types } from "mongoose";
import {
  SESSION_PLAN_SCHEMA_VERSION,
  SessionPlan,
  type IAthleteSnapshot,
} from "@/models";
import { getJsonModel } from "./ai-client";
import { buildContinuityContext, type ContinuityPlanSession } from "./buildContinuityContext";
import {
  assertSessionsRespectPaceGuards,
  derivePaceGuardrails,
  formatPaceGuardsForPrompt,
} from "./paceGuards";
import { rollingWeekWindow } from "./planWindow";
import { nextSessionsResponseSchema } from "./sessionPlanSchema";
import { validateSessionPlanResponse } from "./validateSessionPlan";

const SYSTEM_INSTRUCTION = `Você é um treinador de corrida pessoal.

Gere o plano para os próximos 7 dias (janela rolante a partir de hoje, datas UTC), com exatamente 1 sessão por dia.

Regras:
- Responda apenas com JSON no schema solicitado.
- Exatamente 7 sessões; scheduledDate = cada dia de startDate até endDate (inclusive).
- order 1..7 em ordem cronológica de scheduledDate.
- Inclua dias type "rest" explicitamente (segments deve ser []).
- Em rationale, diga quantos treinos (dias não-rest) há na semana e por quê.
- Todos os textos em linguagem natural (title, purpose, coachingNotes, notes, rationale) em pt-BR.
- Campos enum (type, kind) e números no formato da máquina.
- Pace no plano: minutos por km decimais (ex.: 6.5 = 6:30/km). O snapshot usa segundos por km — converta (345 s/km = 5.75 min/km).
- Respeite estritamente os limites de ritmo do bloco "Limites de ritmo" no pedido do usuário, quando presente.
- Sessões easy / recovery / long_run devem usar ritmos de conversação típicos do atleta (bem mais lentos que o melhor 5k). Nunca prescreva ritmo de prova ou intervalo em easy.
- Segmentos work (tempo/interval) não podem ser mais rápidos que o melhor esforço estimado do snapshot.
- Não invente ritmo de prova sem evidência no snapshot.
- Adapte volume, longão e intensidade ao estado atual, metas e histórico do snapshot.
- Se recentActivities tiverem athleteFeedback (effort/notes), adapte carga e intensidade na sequência (ex.: too_hard → aliviar treinos semelhantes; too_easy → progressão um pouco mais exigente quando seguro).
- Se heartRateCoverage for baixo/incompleto, priorize percepção de esforço sobre zonas de FC.
- Seja progressivo e seguro; não simule prova sem necessidade.
- Use segments (warmup/work/rest/cooldown/steady) para treinos; rest days usam segments [].
- Se houver um bloco de continuidade JSON: preserve em linhas gerais as remainingSessions (objetivo, tipo, estrutura, datas quando ainda caírem na janela); permita ajustes leves; use completedSessions só como contexto do que já foi feito; não reemitir treinos já completed como sessões do novo plano. Se remainingSessions tiverem ritmos irreais, corrija-os para respeitar os limites de ritmo.
- Se houver um bloco "Estilo de treino / Preset": prefira os papéis de cada dia da semana (weekTemplate) e as regras de progressão; mapeie monday…sunday para as datas UTC da janela. Dias strength_or_rest / free → type "rest" (ou easy leve) com coachingNotes explicando força/livre. Ainda adapte por fadiga, feedback, continuidade e segurança — o preset é preferência suave, não trava rígida.
- Se o estilo for adaptive (sem preset): você define a estrutura da semana com base no snapshot, histórico e feedback.`;

export type SnapshotForAi = Omit<IAthleteSnapshot, "userId" | "createdAt">;

function formatTrainingStyleForPrompt(snapshot: SnapshotForAi): string {
  if (snapshot.trainingStyle === "preset" && snapshot.trainingPreset) {
    return `Estilo de treino / Preset (JSON):\n${JSON.stringify(snapshot.trainingPreset)}`;
  }
  return (
    "Estilo de treino: adaptive — sem template fixo de dias da semana; " +
    "monte a estrutura da semana a partir do snapshot, histórico e feedback."
  );
}

export async function generateNextSessions(input: {
  userId: Types.ObjectId;
  athleteSnapshotId: Types.ObjectId;
  snapshot: SnapshotForAi;
  priorPlan?: { sessions: ContinuityPlanSession[] } | null;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const window = rollingWeekWindow(now);

  const continuity =
    input.priorPlan != null ? buildContinuityContext(input.priorPlan, now) : null;
  const paceGuards = derivePaceGuardrails(input.snapshot);

  // AI Prompt builder
  const userText = [
    `Janela do plano (UTC): ${window.startDate} … ${window.endDate}`,
    `Snapshot do atleta (JSON):\n${JSON.stringify(input.snapshot)}`,
    formatTrainingStyleForPrompt(input.snapshot),
    paceGuards ? formatPaceGuardsForPrompt(paceGuards) : null,
    continuity
      ? `Continuidade do plano anterior (JSON):\n${JSON.stringify(continuity)}`
      : null,
  ]
    .filter((part): part is string => part != null)
    .join("\n\n");

  const model = getJsonModel({
    responseSchema: nextSessionsResponseSchema,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: userText }],
      },
    ],
  });

  const text = result.response.text();
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  const validated = validateSessionPlanResponse(parsed, { now });
  if (paceGuards) {
    assertSessionsRespectPaceGuards(validated.sessions, paceGuards);
  }
  const generatedAt = new Date();

  await SessionPlan.create({
    userId: input.userId,
    athleteSnapshotId: input.athleteSnapshotId,
    schemaVersion: SESSION_PLAN_SCHEMA_VERSION,
    status: "open",
    generatedAt,
    rationale: validated.rationale,
    sessions: validated.sessions.map((session) => ({
      ...session,
      status: "open" as const,
    })),
  });
}
