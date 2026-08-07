import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type ResponseSchema,
} from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-3.5-flash";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  if (!client) {
    client = new GoogleGenerativeAI(apiKey);
  }

  return client;
}

export function getJsonModel(options: {
  responseSchema: ResponseSchema;
  systemInstruction: string;
  model?: string;
}): GenerativeModel {
  return getClient().getGenerativeModel({
    model: options.model ?? process.env.GOOGLE_AI_MODEL ?? DEFAULT_MODEL,
    systemInstruction: options.systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: options.responseSchema,
      temperature: 0.4,
    },
  });
}
