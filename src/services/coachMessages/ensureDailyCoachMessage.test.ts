import assert from "node:assert/strict";
import { Types } from "mongoose";
import type { IUserGoal } from "@/models";
import type { ProgressFollowUp } from "@/services/progress/types";
import {
  ensureDailyCoachMessage,
  isDuplicateKeyError,
  type DailyCoachMessageRecord,
  type DailyCoachMessageStore,
} from "./ensureDailyCoachMessage";

const userId = new Types.ObjectId();
const now = new Date("2026-08-15T12:00:00.000Z");
const goal: IUserGoal = {
  type: "5k",
  distanceKm: 5,
  targetTimeSeconds: 1500,
  targetDate: new Date("2026-09-01T00:00:00.000Z"),
};
const progress: ProgressFollowUp = { thisWeek: null, history: [] };

function testIsDuplicateKeyError() {
  assert.equal(isDuplicateKeyError({ code: 11000 }), true);
  assert.equal(isDuplicateKeyError({ code: 11001 }), false);
  assert.equal(isDuplicateKeyError(new Error("nope")), false);
}

async function testSkipsWhenNoGoal() {
  let generateCalls = 0;
  const result = await ensureDailyCoachMessage(userId, {
    now,
    deps: {
      loadGoal: async () => null,
      loadProgress: async () => progress,
      generate: async () => {
        generateCalls += 1;
        return { message: "hi", promptText: "x" };
      },
      store: memoryStore(),
    },
  });
  assert.equal(result, null);
  assert.equal(generateCalls, 0);
}

async function testReturnsExistingWithoutGenerating() {
  let generateCalls = 0;
  const store = memoryStore();
  await store.create({
    userId,
    date: "2026-08-15",
    message: "Já gerado",
    promptText: "old",
    generatedAt: now,
  });

  const result = await ensureDailyCoachMessage(userId, {
    now,
    deps: {
      loadGoal: async () => goal,
      loadProgress: async () => progress,
      generate: async () => {
        generateCalls += 1;
        return { message: "novo", promptText: "x" };
      },
      store,
    },
  });

  assert.deepEqual(result, { date: "2026-08-15", message: "Já gerado" });
  assert.equal(generateCalls, 0);
}

async function testCreatesWhenMissing() {
  const store = memoryStore();
  const result = await ensureDailyCoachMessage(userId, {
    now,
    deps: {
      loadGoal: async () => goal,
      loadProgress: async () => progress,
      generate: async () => ({
        message: "Parabéns pelo treino.",
        promptText: "TODAY\ndate=2026-08-15",
      }),
      store,
    },
  });
  assert.deepEqual(result, {
    date: "2026-08-15",
    message: "Parabéns pelo treino.",
  });
  const saved = await store.findByUserAndDate(userId, "2026-08-15");
  assert.equal(saved?.promptText, "TODAY\ndate=2026-08-15");
}

async function testDuplicateKeyReturnsExisting() {
  const store = memoryStore();
  const racing: DailyCoachMessageStore = {
    findByUserAndDate: async (id, date) => store.findByUserAndDate(id, date),
    create: async () => {
      await store.create({
        userId,
        date: "2026-08-15",
        message: "Primeiro",
        promptText: "p",
        generatedAt: now,
      });
      const err = Object.assign(new Error("E11000 duplicate key"), {
        code: 11000,
      });
      throw err;
    },
  };

  const result = await ensureDailyCoachMessage(userId, {
    now,
    deps: {
      loadGoal: async () => goal,
      loadProgress: async () => progress,
      generate: async () => ({ message: "Segundo", promptText: "p2" }),
      store: racing,
    },
  });

  assert.deepEqual(result, { date: "2026-08-15", message: "Primeiro" });
}

function memoryStore(): DailyCoachMessageStore {
  const docs: DailyCoachMessageRecord[] = [];

  return {
    async findByUserAndDate(id, date) {
      return (
        docs.find(
          (d) => String(d.userId) === String(id) && d.date === date,
        ) ?? null
      );
    },
    async create(doc) {
      if (
        docs.some(
          (d) => String(d.userId) === String(doc.userId) && d.date === doc.date,
        )
      ) {
        throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
      }
      docs.push(doc);
      return doc;
    },
  };
}

async function main() {
  testIsDuplicateKeyError();
  await testSkipsWhenNoGoal();
  await testReturnsExistingWithoutGenerating();
  await testCreatesWhenMissing();
  await testDuplicateKeyReturnsExisting();
  console.log("ensureDailyCoachMessage tests passed");
}

void main();
