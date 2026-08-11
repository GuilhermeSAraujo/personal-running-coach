import type { Types } from "mongoose";
import {
  AthleteSnapshot,
  SESSION_PLAN_SCHEMA_VERSION,
  SessionPlan,
  type IAthleteSnapshot,
} from "@/models";
import { getJsonModel } from "./ai-client";
import {
  buildContinuityContext,
  type ContinuityContext,
  type ContinuityPlanSession,
} from "./buildContinuityContext";
import { formatCompactSnapshotForPrompt } from "./formatCompactSnapshotForPrompt";
import { formatContinuityForPrompt } from "./formatContinuityForPrompt";
import {
  assertSessionsRespectPaceGuards,
  derivePaceGuardrails,
} from "./paceGuards";
import { rollingWeekWindow } from "./planWindow";
import { nextSessionsResponseSchema } from "./sessionPlanSchema";
import { validateSessionPlanResponse } from "./validateSessionPlan";

const SYSTEM_INSTRUCTION = `Você é um treinador de corrida pessoal.

Gere o plano para os próximos 7 dias (janela rolante a partir de hoje, datas UTC), com exatamente 1 sessão por dia.

O pedido do usuário usa texto rotulado (ATHLETE, GOAL, CURRENT_STATE, PERFORMANCE, RECENT_*, PACE_RULES, TRAINING_PRESET ou TRAINING_STYLE, e opcionalmente PLAN_CONTINUITY). Ritmos já estão em minutos por km decimais.

Regras:
- Responda apenas com JSON no schema solicitado.
- Exatamente 7 sessões; scheduledDate = cada dia de startDate até endDate (inclusive).
- order 1..7 em ordem cronológica de scheduledDate.
- Inclua dias type "rest" explicitamente (segments deve ser []).
- Em rationale, diga quantos treinos (dias não-rest) há na semana e por quê.
- Todos os textos em linguagem natural (title, purpose, coachingNotes, notes, rationale) em pt-BR.
- Campos enum (type, kind) e números no formato da máquina.
- Pace no plano: minutos por km decimais (ex.: 6.5 = 6:30/km).
- Respeite estritamente o bloco PACE_RULES quando presente.
- Sessões easy / recovery / long_run devem usar ritmos de conversação típicos do atleta (bem mais lentos que o melhor 5k). Nunca prescreva ritmo de prova ou intervalo em easy.
- Segmentos work (tempo/interval) não podem ser mais rápidos que o âncora / work.min de PACE_RULES.
- Não invente ritmo de prova sem evidência em PERFORMANCE / RECENT_*.
- Adapte volume, longão e intensidade a CURRENT_STATE, GOAL e RECENT_*.
- Se RECENT_ACTIVITIES tiverem effort/notes de feedback, adapte carga e intensidade na sequência (ex.: too_hard → aliviar treinos semelhantes; too_easy → progressão um pouco mais exigente quando seguro).
- Se hrCoverage for baixo/incompleto, priorize percepção de esforço sobre zonas de FC.
- Seja progressivo e seguro; não simule prova sem necessidade.
- Use segments (warmup/work/rest/cooldown/steady) para treinos; rest days usam segments [].
- Se houver PLAN_CONTINUITY: preserve em linhas gerais as sessões REMAINING (objetivo, tipo, estrutura, datas quando ainda caírem na janela); permita ajustes leves; use COMPLETED só como contexto do que já foi feito; não reemitir treinos já completed como sessões do novo plano. Se REMAINING tiverem ritmos irreais, corrija-os para respeitar PACE_RULES.
- Se houver TRAINING_PRESET: prefira os papéis de cada dia (sun…sat) e PRESET_RULES; mapeie para as datas UTC da janela. Dias strength_or_rest / free → type "rest" (ou easy leve) com coachingNotes explicando força/livre. Ainda adapte por fadiga, feedback, continuidade e segurança — o preset é preferência suave, não trava rígida.
- Se TRAINING_STYLE=adaptive: você define a estrutura da semana com base em CURRENT_STATE, histórico recente e feedback.`;

export type SnapshotForAi = Omit<IAthleteSnapshot, "userId" | "createdAt">;

/** Pure assembler for the Gemini user message (testable; no I/O). */
export function assembleNextSessionsUserText(input: {
  window: { startDate: string; endDate: string };
  promptText: string;
  continuity: ContinuityContext | null;
}): string {
  return [
    `Janela do plano (UTC): ${input.window.startDate} … ${input.window.endDate}`,
    input.promptText,
    input.continuity ? formatContinuityForPrompt(input.continuity) : null,
  ]
    .filter((part): part is string => part != null)
    .join("\n\n");
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
  const promptText = formatCompactSnapshotForPrompt(input.snapshot, paceGuards);

  await AthleteSnapshot.updateOne(
    { _id: input.athleteSnapshotId },
    { $set: { promptText } },
  );

  const userText = assembleNextSessionsUserText({
    window,
    promptText,
    continuity,
  });

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
