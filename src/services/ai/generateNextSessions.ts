import type { Types } from "mongoose";
import {
  SESSION_PLAN_SCHEMA_VERSION,
  SessionPlan,
  type IAthleteSnapshot,
} from "@/models";
import { getJsonModel } from "./ai-client";
import { nextSessionsResponseSchema } from "./sessionPlanSchema";
import { validateSessionPlanResponse } from "./validateSessionPlan";

const SYSTEM_INSTRUCTION = `Você é um treinador de corrida pessoal.

Gere exatamente as próximas 3 sessões de corrida para o atleta com base no snapshot JSON fornecido.

Regras:
- Responda apenas com JSON no schema solicitado.
- Todos os textos em linguagem natural (title, purpose, coachingNotes, notes, rationale) devem estar em português do Brasil (pt-BR).
- Campos enum (type, kind) e números permanecem no formato da máquina (inglês / decimal).
- Pace em minutos por km decimais (ex.: 6.5 = 6:30/km).
- Adapte volume, longão e intensidade ao estado atual, metas e histórico do snapshot.
- Se heartRateCoverage for baixo/incompleto, priorize percepção de esforço sobre zonas de FC.
- Seja progressivo e seguro; não simule prova sem necessidade.
- Use segments (warmup/work/rest/cooldown/steady) para descrever a estrutura, inclusive intervalos com repeat.`;

export type SnapshotForAi = Omit<IAthleteSnapshot, "userId" | "createdAt">;

export async function generateNextSessions(input: {
  userId: Types.ObjectId;
  athleteSnapshotId: Types.ObjectId;
  snapshot: SnapshotForAi;
}): Promise<void> {
  const model = getJsonModel({
    responseSchema: nextSessionsResponseSchema,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Snapshot do atleta (JSON):\n${JSON.stringify(input.snapshot)}`,
          },
        ],
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

  const validated = validateSessionPlanResponse(parsed);
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
