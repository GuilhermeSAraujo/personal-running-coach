import { SchemaType, type ResponseSchema } from "@google/generative-ai";

export const dailyCoachMessageResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    message: {
      type: SchemaType.STRING,
      description:
        "2 a 4 frases em português do Brasil sobre consistência no plano e progresso rumo à meta",
    },
  },
  required: ["message"],
};
