import { getJsonModel } from "./ai-client";
import { dailyCoachMessageResponseSchema } from "./dailyCoachMessageSchema";
import {
  formatDailyCoachPrompt,
  type DailyCoachPromptInput,
} from "./formatDailyCoachPrompt";

const SYSTEM_INSTRUCTION = `Você é um treinador de corrida pessoal.

Escreva um recado curto (2 a 4 frases) em português do Brasil sobre o estado atual do atleta: consistência em relação ao plano e progresso rumo à meta.

Regras:
- Responda apenas com JSON no schema solicitado ({ "message": "..." }).
- Tom de coach: direto, encorajador, específico.
- Baseie-se só no que está em TODAY, GOAL e PLAN_VS_RUNS. Não invente treinos, ritmos ou datas.
- Comente o último treino executado vs o que o plano pedia, quando houver dados.
- Se o atleta está seguindo o plano, reconheça isso. Se faltou treino ou houve corrida fora do plano, mencione com calma e oriente o próximo passo.
- Sem conselho médico. Sem listas. Sem markdown.`;

export type GeneratedDailyCoachMessage = {
  message: string;
  promptText: string;
};

export function assembleDailyCoachUserText(input: DailyCoachPromptInput): string {
  return formatDailyCoachPrompt(input);
}

export async function generateDailyCoachMessage(
  input: DailyCoachPromptInput,
): Promise<GeneratedDailyCoachMessage> {
  const promptText = assembleDailyCoachUserText(input);

  const model = getJsonModel({
    responseSchema: dailyCoachMessageResponseSchema,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: promptText }],
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

  if (
    typeof parsed !== "object" ||
    parsed == null ||
    typeof (parsed as { message?: unknown }).message !== "string"
  ) {
    throw new Error("Gemini returned an invalid daily coach message");
  }

  const message = (parsed as { message: string }).message.trim();
  if (!message) {
    throw new Error("Gemini returned an empty daily coach message");
  }

  return { message, promptText };
}
