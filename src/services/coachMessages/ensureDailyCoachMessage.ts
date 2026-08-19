import type { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import {
  DAILY_COACH_MESSAGE_SCHEMA_VERSION,
  DailyCoachMessage,
  User,
  type IDailyCoachMessage,
  type IUserGoal,
} from "@/models";
import { generateDailyCoachMessage } from "@/services/ai/generateDailyCoachMessage";
import { getProgressFollowUp } from "@/services/progress/getProgressFollowUp";
import type { ProgressFollowUp } from "@/services/progress/types";

export type DailyCoachMessageView = {
  date: string;
  message: string;
};

export type DailyCoachMessageRecord = {
  userId: Types.ObjectId | string;
  date: string;
  message: string;
  promptText: string;
  generatedAt: Date;
};

export type DailyCoachMessageStore = {
  findByUserAndDate: (
    userId: Types.ObjectId | string,
    date: string,
  ) => Promise<DailyCoachMessageRecord | null>;
  create: (
    doc: DailyCoachMessageRecord,
  ) => Promise<DailyCoachMessageRecord>;
  replace: (
    doc: DailyCoachMessageRecord,
  ) => Promise<DailyCoachMessageRecord>;
};

export type EnsureDailyCoachMessageDeps = {
  loadGoal: (userId: Types.ObjectId | string) => Promise<IUserGoal | null>;
  loadProgress: (userId: Types.ObjectId | string) => Promise<ProgressFollowUp>;
  generate: typeof generateDailyCoachMessage;
  store: DailyCoachMessageStore;
};

export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err != null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toRecord(
  doc: Pick<
    IDailyCoachMessage,
    "userId" | "date" | "message" | "promptText" | "generatedAt"
  >,
): DailyCoachMessageRecord {
  return {
    userId: doc.userId,
    date: doc.date,
    message: doc.message,
    promptText: doc.promptText,
    generatedAt: doc.generatedAt,
  };
}

const mongoStore: DailyCoachMessageStore = {
  async findByUserAndDate(userId, date) {
    const doc = await DailyCoachMessage.findOne({ userId, date }).lean();
    return doc ? toRecord(doc) : null;
  },
  async create(doc) {
    const created = await DailyCoachMessage.create({
      ...doc,
      schemaVersion: DAILY_COACH_MESSAGE_SCHEMA_VERSION,
    });
    return toRecord(created);
  },
  async replace(doc) {
    const updated = await DailyCoachMessage.findOneAndUpdate(
      { userId: doc.userId, date: doc.date },
      {
        $set: {
          message: doc.message,
          promptText: doc.promptText,
          generatedAt: doc.generatedAt,
          schemaVersion: DAILY_COACH_MESSAGE_SCHEMA_VERSION,
        },
      },
      { upsert: true, new: true },
    );
    if (!updated) {
      throw new Error("Failed to replace daily coach message");
    }
    return toRecord(updated);
  },
};

async function defaultLoadGoal(
  userId: Types.ObjectId | string,
): Promise<IUserGoal | null> {
  const user = await User.findById(userId).select("goal").lean();
  return user?.goal ?? null;
}

export async function ensureDailyCoachMessage(
  userId: Types.ObjectId | string,
  options?: {
    now?: Date;
    force?: boolean;
    deps?: EnsureDailyCoachMessageDeps;
  },
): Promise<DailyCoachMessageView | null> {
  const now = options?.now ?? new Date();
  const deps = options?.deps;

  if (!deps) {
    await dbConnect();
  }

  const loadGoal = deps?.loadGoal ?? defaultLoadGoal;
  const loadProgress = deps?.loadProgress ?? getProgressFollowUp;
  const generate = deps?.generate ?? generateDailyCoachMessage;
  const store = deps?.store ?? mongoStore;

  const goal = await loadGoal(userId);
  if (!goal?.type) {
    return null;
  }

  const date = toUtcDateString(now);
  const existing = await store.findByUserAndDate(userId, date);
  if (existing && !options?.force) {
    return { date: existing.date, message: existing.message };
  }

  const progress = await loadProgress(userId);
  const generated = await generate({ goal, progress, now });

  const record = {
    userId,
    date,
    message: generated.message,
    promptText: generated.promptText,
    generatedAt: now,
  };

  if (options?.force) {
    const replaced = await store.replace(record);
    return { date: replaced.date, message: replaced.message };
  }

  try {
    const created = await store.create(record);
    return { date: created.date, message: created.message };
  } catch (err) {
    if (!isDuplicateKeyError(err)) {
      throw err;
    }
    const raced = await store.findByUserAndDate(userId, date);
    if (!raced) {
      throw err;
    }
    return { date: raced.date, message: raced.message };
  }
}
