import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { SEGMENT_KINDS, SESSION_TYPES } from "@/models";

const numberSchema = { type: SchemaType.NUMBER } as const;
const optionalNumberSchema = {
  type: SchemaType.NUMBER,
  nullable: true,
} as const;
const optionalStringSchema = {
  type: SchemaType.STRING,
  nullable: true,
} as const;

const segmentSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    kind: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [...SEGMENT_KINDS],
    },
    repeat: optionalNumberSchema,
    distanceKm: optionalNumberSchema,
    distanceKmMin: optionalNumberSchema,
    distanceKmMax: optionalNumberSchema,
    durationMinutes: optionalNumberSchema,
    paceMinPerKm: optionalNumberSchema,
    paceMaxPerKm: optionalNumberSchema,
    hrMin: optionalNumberSchema,
    hrMax: optionalNumberSchema,
    notes: optionalStringSchema,
  },
  required: ["kind"],
};

const plannedSessionSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    order: numberSchema,
    title: {
      type: SchemaType.STRING,
      description: "Título curto em português do Brasil",
    },
    type: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [...SESSION_TYPES],
    },
    purpose: {
      type: SchemaType.STRING,
      description: "Objetivo da sessão em português do Brasil",
    },
    totalDistanceKmMin: optionalNumberSchema,
    totalDistanceKmMax: optionalNumberSchema,
    coachingNotes: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    segments: {
      type: SchemaType.ARRAY,
      items: segmentSchema,
      minItems: 1,
    },
  },
  required: ["order", "title", "type", "purpose", "coachingNotes", "segments"],
};

/** Gemini structured-output schema for exactly 3 planned sessions. */
export const nextSessionsResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    rationale: {
      type: SchemaType.STRING,
      nullable: true,
      description:
        "Breve justificativa do bloco de 3 sessões em português do Brasil",
    },
    sessions: {
      type: SchemaType.ARRAY,
      items: plannedSessionSchema,
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ["sessions"],
};
