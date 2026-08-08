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
    scheduledDate: {
      type: SchemaType.STRING,
      description: "YYYY-MM-DD (UTC)",
    },
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
      minItems: 0,
    },
  },
  required: [
    "order",
    "scheduledDate",
    "title",
    "type",
    "purpose",
    "coachingNotes",
    "segments",
  ],
};

/** Gemini structured-output schema for exactly 7 dated planned sessions (one rolling week). */
export const nextSessionsResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    rationale: {
      type: SchemaType.STRING,
      nullable: true,
      description:
        "Breve justificativa do plano semanal (contagem e distribuição dos treinos) em português do Brasil",
    },
    sessions: {
      type: SchemaType.ARRAY,
      items: plannedSessionSchema,
      minItems: 7,
      maxItems: 7,
    },
  },
  required: ["sessions"],
};
