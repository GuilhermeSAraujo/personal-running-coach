import assert from "node:assert/strict";
import { validateSessionPlanResponse } from "./validateSessionPlan";

const tempoFixture = {
  rationale: "Bloco focado em volume aeróbico com um estímulo controlado.",
  sessions: [
    {
      order: 1,
      title: "Aeróbico leve",
      type: "easy",
      purpose: "Recuperar do treino recente e manter volume aeróbico.",
      totalDistanceKmMin: 6,
      totalDistanceKmMax: 6,
      coachingNotes: [
        "Esforço conversacional.",
        "Priorize percepção de esforço sobre FC.",
      ],
      segments: [
        {
          kind: "steady",
          distanceKm: 6,
          paceMinPerKm: 6.5,
          paceMaxPerKm: 7,
          hrMin: 145,
          hrMax: 155,
          notes: "Sem intervalos.",
        },
      ],
    },
    {
      order: 2,
      title: "Tempo controlado",
      type: "tempo",
      purpose: "Introduzir trabalho sustentado próximo do limiar atual.",
      totalDistanceKmMin: 7,
      totalDistanceKmMax: 8,
      coachingNotes: ["Controlado/forte, não ritmo de prova de 5K."],
      segments: [
        { kind: "warmup", distanceKm: 1.5, notes: "fácil" },
        {
          kind: "work",
          repeat: 3,
          distanceKm: 1.5,
          paceMinPerKm: 5.92,
          paceMaxPerKm: 6.08,
        },
        { kind: "rest", durationMinutes: 2, notes: "trote fácil" },
        {
          kind: "cooldown",
          distanceKmMin: 1,
          distanceKmMax: 1.5,
        },
      ],
    },
    {
      order: 3,
      title: "Longão fácil",
      type: "long_run",
      purpose: "Reconstruir durabilidade do longão a partir de ~10 km.",
      totalDistanceKmMin: 12,
      totalDistanceKmMax: 12,
      coachingNotes: [
        "Primeiros 8–9 km particularmente confortáveis.",
        "Sem finalização rápida nesta semana.",
      ],
      segments: [
        {
          kind: "steady",
          distanceKm: 12,
          paceMinPerKm: 6.42,
          paceMaxPerKm: 6.92,
        },
      ],
    },
  ],
};

function testValidTempoFixture() {
  const result = validateSessionPlanResponse(tempoFixture);
  assert.equal(result.sessions.length, 3);
  assert.equal(result.sessions[1]!.type, "tempo");
  assert.equal(result.sessions[1]!.segments[1]!.repeat, 3);
  assert.equal(result.sessions[1]!.segments[1]!.paceMinPerKm, 5.92);
  assert.equal(result.rationale?.includes("aeróbico"), true);
}

function testRejectsWrongSessionCount() {
  assert.throws(
    () =>
      validateSessionPlanResponse({
        sessions: tempoFixture.sessions.slice(0, 2),
      }),
    /exactly 3/,
  );
}

function testRejectsInvalidType() {
  assert.throws(
    () =>
      validateSessionPlanResponse({
        sessions: [
          { ...tempoFixture.sessions[0], type: "race" },
          tempoFixture.sessions[1],
          tempoFixture.sessions[2],
        ],
      }),
    /SessionType/,
  );
}

function testRejectsBadOrders() {
  assert.throws(
    () =>
      validateSessionPlanResponse({
        sessions: [
          { ...tempoFixture.sessions[0], order: 1 },
          { ...tempoFixture.sessions[1], order: 1 },
          { ...tempoFixture.sessions[2], order: 3 },
        ],
      }),
    /orders 1, 2, and 3/,
  );
}

function testStripsNullOptionals() {
  const result = validateSessionPlanResponse({
    rationale: null,
    sessions: tempoFixture.sessions.map((session) => ({
      ...session,
      totalDistanceKmMin: null,
      segments: session.segments.map((segment) => ({
        ...segment,
        notes: null,
      })),
    })),
  });
  assert.equal(result.rationale, undefined);
  assert.equal(result.sessions[0]!.totalDistanceKmMin, undefined);
  assert.equal(result.sessions[0]!.segments[0]!.notes, undefined);
}

testValidTempoFixture();
testRejectsWrongSessionCount();
testRejectsInvalidType();
testRejectsBadOrders();
testStripsNullOptionals();

console.log("validateSessionPlan tests passed");
