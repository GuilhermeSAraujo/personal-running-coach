# Weekly Session Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed 3-session AI plan with a rolling 7-day dated week (run + explicit rest days) and soft continuity context on re-generation after matches.

**Architecture:** Keep match → supersede → snapshot → new plan. Change the AI contract to exactly 7 dated days (`rest` included). On regen, build a continuity payload from the prior plan (matched vs open) and pass it in the prompt only; the new plan stores only the upcoming week. UTC calendar dates match existing snapshot week helpers.

**Tech Stack:** TypeScript, Mongoose `SessionPlan`, Gemini structured JSON (`@google/generative-ai`), existing `node:assert/strict` + `npx tsx` colocated tests, Chakra UI plan components.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-08-weekly-session-plan-design.md`
- Window: rolling UTC dates `[today … today+6]` — exactly 7 sessions, one per date
- `SESSION_TYPES` includes `"rest"`; rest sessions have `segments: []` and no distance/pace/HR
- Soft continuity via prompt only; new plan does not re-store completed sessions
- No `SESSION_PLAN_SCHEMA_VERSION` bump (DB wipe OK)
- Same-day match bias out of scope
- Natural-language AI fields remain pt-BR
- Do not commit unless the user asks (project preference overrides frequent-commit plan default)

---

## File map

| File | Responsibility |
| --- | --- |
| `src/services/ai/planWindow.ts` | UTC date strings + rolling 7-day window |
| `src/services/ai/buildContinuityContext.ts` | Split prior plan into completed vs remaining for the prompt |
| `src/models/shared.ts` | Add `rest` to `SESSION_TYPES` |
| `src/models/SessionPlan.ts` | `scheduledDate`; sessions length exactly 7 |
| `src/services/ai/types.ts` | `scheduledDate` on `AiPlannedSession` |
| `src/services/ai/sessionPlanSchema.ts` | Gemini schema: 7 sessions + `scheduledDate` |
| `src/services/ai/validateSessionPlan.ts` | Validate week coverage, rest rules, orders |
| `src/services/ai/generateNextSessions.ts` | Weekly prompt + continuity user message |
| `src/services/snapshot/generateAthleteSnapshot.ts` | Accept optional prior plan → continuity |
| `src/services/matching/confirmMatches.ts` | Pass superseded plan into snapshot regen; reject rest matches |
| `src/services/strava/syncActivities.ts` | Exclude rest from match candidates / match UI payload |
| `src/lib/sessionPlanFormat.ts` | Label for `rest` |
| `src/services/sessionPlans/types.ts` + `serialize.ts` | Surface `scheduledDate` |
| UI components + `docs/activity-sync.md` | Show dates; document weekly + continuity |

---

### Task 1: Rolling week date helpers

**Files:**
- Create: `src/services/ai/planWindow.ts`
- Create: `src/services/ai/planWindow.test.ts`

**Interfaces:**
- Produces:
  - `utcDateString(date: Date): string` → `YYYY-MM-DD` in UTC
  - `addUtcDays(date: Date, days: number): Date` → UTC midnight + days
  - `rollingWeekDates(now: Date): string[]` → exactly 7 ascending date strings
  - `rollingWeekWindow(now: Date): { startDate: string; endDate: string }`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import {
  addUtcDays,
  rollingWeekDates,
  rollingWeekWindow,
  utcDateString,
} from "./planWindow";

function testUtcDateString() {
  assert.equal(utcDateString(new Date("2026-08-08T15:30:00.000Z")), "2026-08-08");
}

function testRollingWeekDates() {
  const dates = rollingWeekDates(new Date("2026-08-08T22:00:00.000Z"));
  assert.deepEqual(dates, [
    "2026-08-08",
    "2026-08-09",
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
    "2026-08-14",
  ]);
  assert.deepEqual(rollingWeekWindow(new Date("2026-08-08T22:00:00.000Z")), {
    startDate: "2026-08-08",
    endDate: "2026-08-14",
  });
}

function testAddUtcDays() {
  assert.equal(
    utcDateString(addUtcDays(new Date("2026-08-08T12:00:00.000Z"), 6)),
    "2026-08-14",
  );
}

testUtcDateString();
testRollingWeekDates();
testAddUtcDays();
console.log("planWindow tests passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/services/ai/planWindow.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement helpers**

```ts
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): Date {
  const start = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return new Date(start + days * MS_PER_DAY);
}

export function rollingWeekDates(now: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => utcDateString(addUtcDays(now, i)));
}

export function rollingWeekWindow(now: Date): {
  startDate: string;
  endDate: string;
} {
  const dates = rollingWeekDates(now);
  return { startDate: dates[0]!, endDate: dates[6]! };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/services/ai/planWindow.test.ts`

Expected: `planWindow tests passed`

- [ ] **Step 5: Commit only if the user asked**

---

### Task 2: Continuity context builder

**Files:**
- Create: `src/services/ai/buildContinuityContext.ts`
- Create: `src/services/ai/buildContinuityContext.test.ts`

**Interfaces:**
- Consumes: `rollingWeekWindow` from `./planWindow`; session shapes with `status`, optional `scheduledDate`, `activityId`
- Produces:
  - `ContinuitySession` type (prompt-safe plain object)
  - `ContinuityContext` type: `{ window, completedSessions, remainingSessions }`
  - `buildContinuityContext(plan: { sessions: ContinuityPlanSession[] }, now?: Date): ContinuityContext`
  - Matched → `completedSessions`; open/missing status → `remainingSessions`; ignore other statuses

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { buildContinuityContext } from "./buildContinuityContext";

const now = new Date("2026-08-08T12:00:00.000Z");

function testSplitsMatchedAndOpen() {
  const ctx = buildContinuityContext(
    {
      sessions: [
        {
          order: 1,
          title: "Easy",
          type: "easy",
          purpose: "aerobic",
          scheduledDate: "2026-08-05",
          coachingNotes: ["easy"],
          segments: [{ kind: "steady", distanceKm: 6 }],
          status: "matched",
          activityId: "act1",
        },
        {
          order: 2,
          title: "Rest",
          type: "rest",
          purpose: "recover",
          scheduledDate: "2026-08-09",
          coachingNotes: ["sleep"],
          segments: [],
          status: "open",
        },
        {
          order: 3,
          title: "Tempo",
          type: "tempo",
          purpose: "threshold",
          scheduledDate: "2026-08-10",
          coachingNotes: ["controlled"],
          segments: [{ kind: "work", distanceKm: 5 }],
          status: "open",
        },
      ],
    },
    now,
  );

  assert.deepEqual(ctx.window, {
    startDate: "2026-08-08",
    endDate: "2026-08-14",
  });
  assert.equal(ctx.completedSessions.length, 1);
  assert.equal(ctx.completedSessions[0]!.title, "Easy");
  assert.equal(ctx.completedSessions[0]!.activityId, "act1");
  assert.equal(ctx.remainingSessions.length, 2);
  assert.equal(ctx.remainingSessions[0]!.type, "rest");
  assert.equal(ctx.remainingSessions[1]!.type, "tempo");
}

testSplitsMatchedAndOpen();
console.log("buildContinuityContext tests passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/services/ai/buildContinuityContext.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement builder**

```ts
import { rollingWeekWindow } from "./planWindow";
import type { SessionType } from "@/models";

export type ContinuityPlanSession = {
  order: number;
  title: string;
  type: SessionType | string;
  purpose: string;
  scheduledDate?: string;
  coachingNotes?: string[];
  segments?: unknown[];
  status?: string;
  activityId?: unknown;
};

export type ContinuitySession = {
  order: number;
  title: string;
  type: string;
  purpose: string;
  scheduledDate?: string;
  coachingNotes: string[];
  segments: unknown[];
  activityId?: string;
};

export type ContinuityContext = {
  window: { startDate: string; endDate: string };
  completedSessions: ContinuitySession[];
  remainingSessions: ContinuitySession[];
};

function toContinuitySession(session: ContinuityPlanSession): ContinuitySession {
  const out: ContinuitySession = {
    order: session.order,
    title: session.title,
    type: String(session.type),
    purpose: session.purpose,
    coachingNotes: session.coachingNotes ?? [],
    segments: session.segments ?? [],
  };
  if (session.scheduledDate) out.scheduledDate = session.scheduledDate;
  if (session.activityId != null) out.activityId = String(session.activityId);
  return out;
}

export function buildContinuityContext(
  plan: { sessions: ContinuityPlanSession[] },
  now: Date = new Date(),
): ContinuityContext {
  const completedSessions: ContinuitySession[] = [];
  const remainingSessions: ContinuitySession[] = [];

  for (const session of plan.sessions) {
    const mapped = toContinuitySession(session);
    if (session.status === "matched") {
      completedSessions.push(mapped);
      continue;
    }
    if (session.status == null || session.status === "open") {
      remainingSessions.push(mapped);
    }
  }

  completedSessions.sort((a, b) => a.order - b.order);
  remainingSessions.sort((a, b) => a.order - b.order);

  return {
    window: rollingWeekWindow(now),
    completedSessions,
    remainingSessions,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/services/ai/buildContinuityContext.test.ts`

Expected: `buildContinuityContext tests passed`

- [ ] **Step 5: Commit only if the user asked**

---

### Task 3: Model — `rest` type + `scheduledDate` + length 7

**Files:**
- Modify: `src/models/shared.ts` (`SESSION_TYPES`)
- Modify: `src/models/SessionPlan.ts` (`IPlannedSession`, schema, validator)
- Modify: `src/lib/sessionPlanFormat.ts` (`SESSION_TYPE_LABELS`)

**Interfaces:**
- Produces: `SessionType` includes `"rest"`; `IPlannedSession.scheduledDate: string`; mongoose validates `sessions.length === 7`

- [ ] **Step 1: Add `rest` to `SESSION_TYPES`**

In `src/models/shared.ts`, change to:

```ts
export const SESSION_TYPES = [
  "easy",
  "tempo",
  "long_run",
  "interval",
  "recovery",
  "rest",
] as const;
```

- [ ] **Step 2: Add `scheduledDate` and length-7 validator on `SessionPlan`**

In `src/models/SessionPlan.ts`:

- On `IPlannedSession`, add `scheduledDate: string`
- On `plannedSessionSchema`, add `scheduledDate: { type: String, required: true }`
- Change sessions validator from `value.length === 3` / message `"exactly 3"` to `value.length === 7` / `"sessions must contain exactly 7 items"`

- [ ] **Step 3: Label for rest in UI formatter**

In `src/lib/sessionPlanFormat.ts`, add `rest: "Rest"` to `SESSION_TYPE_LABELS`.

- [ ] **Step 4: Typecheck touched models**

Run: `npx tsc --noEmit`

Expected: may still fail on AI/UI until later tasks; fix only errors introduced in this task’s files if any are model-related. If `tsc` fails solely because callers still expect 3 sessions / missing `scheduledDate`, proceed — those are fixed in Tasks 4–8.

- [ ] **Step 5: Commit only if the user asked**

---

### Task 4: AI schema + validator for weekly plans (TDD)

**Files:**
- Modify: `src/services/ai/types.ts`
- Modify: `src/services/ai/sessionPlanSchema.ts`
- Modify: `src/services/ai/validateSessionPlan.ts`
- Modify: `src/services/ai/validateSessionPlan.test.ts`

**Interfaces:**
- Consumes: `rollingWeekDates` from `./planWindow`; `SESSION_TYPES` including `rest`
- Produces:
  - `AiPlannedSession.scheduledDate: string`
  - `validateSessionPlanResponse(value, options?: { now?: Date }): AiNextSessionsResponse`
  - Gemini schema: `minItems/maxItems: 7`, `scheduledDate` required

- [ ] **Step 1: Rewrite the test fixture and cases for 7 dated days**

Replace `validateSessionPlan.test.ts` with a helper that builds a valid 7-day plan and tests:

1. Accepts a full week with mix of run + rest
2. Rejects length ≠ 7
3. Rejects missing/wrong date coverage
4. Rejects rest with segments or distance fields
5. Rejects non-rest with empty segments
6. Rejects bad orders (not 1…7 chronological)
7. Still strips null optionals

Sketch for a minimal valid week builder (put full concrete objects in the test file):

```ts
function restDay(order: number, scheduledDate: string) {
  return {
    order,
    scheduledDate,
    title: "Descanso",
    type: "rest",
    purpose: "Recuperação.",
    coachingNotes: ["Durma bem."],
    segments: [],
  };
}

function easyDay(order: number, scheduledDate: string) {
  return {
    order,
    scheduledDate,
    title: "Aeróbico leve",
    type: "easy",
    purpose: "Volume fácil.",
    totalDistanceKmMin: 6,
    totalDistanceKmMax: 6,
    coachingNotes: ["Conversacional."],
    segments: [{ kind: "steady", distanceKm: 6, paceMinPerKm: 6.5, paceMaxPerKm: 7 }],
  };
}

// Build dates 2026-08-08 .. 2026-08-14 with e.g. run on 1,3,5,7 and rest on 2,4,6
const now = new Date("2026-08-08T12:00:00.000Z");
```

Call `validateSessionPlanResponse(payload, { now })` in every test.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx tsx src/services/ai/validateSessionPlan.test.ts`

Expected: FAIL on count / missing `scheduledDate`

- [ ] **Step 3: Update types**

In `src/services/ai/types.ts`:

```ts
/** AI JSON response for the next 7 dated sessions (natural-language fields in pt-BR). */
export interface AiPlannedSession {
  order: number;
  scheduledDate: string;
  title: string;
  type: SessionType;
  purpose: string;
  totalDistanceKmMin?: number;
  totalDistanceKmMax?: number;
  coachingNotes: string[];
  segments: AiSessionSegment[];
}
```

- [ ] **Step 4: Update Gemini response schema**

In `sessionPlanSchema.ts`:

- Add `scheduledDate: { type: SchemaType.STRING, description: "YYYY-MM-DD (UTC)" }` to `plannedSessionSchema.properties`
- Add `"scheduledDate"` to `required`
- Set `segments.minItems` to `0` (rest may be empty; validator enforces run vs rest)
- Change `sessions` to `minItems: 7`, `maxItems: 7`
- Update rationale description to weekly / training-count wording in pt-BR

- [ ] **Step 5: Update `validateSessionPlanResponse`**

Implement these rules (exact error substrings should match the tests):

```ts
export function validateSessionPlanResponse(
  value: unknown,
  options?: { now?: Date },
): AiNextSessionsResponse {
  const now = options?.now ?? new Date();
  const expectedDates = rollingWeekDates(now);

  // ... object / rationale checks ...

  if (!Array.isArray(value.sessions) || value.sessions.length !== 7) {
    throw new Error("sessions must contain exactly 7 items");
  }

  const sessions = value.sessions.map((session, index) =>
    assertSession(session, `sessions[${index}]`),
  );

  // orders must be 1..7
  const orders = sessions.map((s) => s.order).sort((a, b) => a - b);
  if (!orders.every((order, i) => order === i + 1)) {
    throw new Error("sessions must have orders 1 through 7");
  }

  // chronological: sort by scheduledDate must equal order 1..7 sequence
  const byDate = [...sessions].sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate),
  );
  for (let i = 0; i < 7; i++) {
    if (byDate[i]!.order !== i + 1) {
      throw new Error("sessions must have orders 1 through 7 in chronological date order");
    }
    if (byDate[i]!.scheduledDate !== expectedDates[i]) {
      throw new Error(
        `sessions must cover each date in the rolling week (${expectedDates[0]}…${expectedDates[6]})`,
      );
    }
  }

  // In assertSession:
  // - require scheduledDate string matching /^\d{4}-\d{2}-\d{2}$/
  // - if type === "rest": segments must be [], and reject totalDistanceKm* / any segment metrics
  // - if type !== "rest": segments.length >= 1 (existing)
}
```

Return sessions sorted by `order` ascending.

- [ ] **Step 6: Run tests — expect PASS**

Run: `npx tsx src/services/ai/validateSessionPlan.test.ts`

Expected: `validateSessionPlan tests passed`

- [ ] **Step 7: Commit only if the user asked**

---

### Task 5: `generateNextSessions` — weekly prompt + continuity

**Files:**
- Modify: `src/services/ai/generateNextSessions.ts`

**Interfaces:**
- Consumes: `buildContinuityContext`, `rollingWeekWindow`, `validateSessionPlanResponse(..., { now })`
- Produces: `generateNextSessions({ userId, athleteSnapshotId, snapshot, priorPlan?, now? })`

- [ ] **Step 1: Replace system instruction**

Use a system prompt equivalent to:

```ts
const SYSTEM_INSTRUCTION = `Você é um treinador de corrida pessoal.

Gere o plano para os próximos 7 dias (janela rolante a partir de hoje, datas UTC), com exatamente 1 sessão por dia.

Regras:
- Responda apenas com JSON no schema solicitado.
- Exatamente 7 sessões; scheduledDate = cada dia de startDate até endDate (inclusive).
- order 1..7 em ordem cronológica de scheduledDate.
- Inclua dias type "rest" explicitamente (segments deve ser []).
- Em rationale, diga quantos treinos (dias não-rest) há na semana e por quê.
- Todos os textos em linguagem natural (title, purpose, coachingNotes, notes, rationale) em pt-BR.
- Campos enum (type, kind) e números no formato da máquina.
- Pace em minutos por km decimais (ex.: 6.5 = 6:30/km).
- Adapte volume, longão e intensidade ao snapshot.
- Se heartRateCoverage for baixo/incompleto, priorize percepção de esforço sobre zonas de FC.
- Seja progressivo e seguro.
- Use segments (warmup/work/rest/cooldown/steady) para treinos; rest days usam segments [].
- Se houver um bloco de continuidade JSON: preserve em linhas gerais as remainingSessions (objetivo, tipo, estrutura, datas quando ainda caírem na janela); permita ajustes leves; use completedSessions só como contexto do que já foi feito; não reemitir treinos já completed como sessões do novo plano.`;
```

- [ ] **Step 2: Accept optional prior plan and build user message**

```ts
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
    input.priorPlan != null
      ? buildContinuityContext(input.priorPlan, now)
      : null;

  const userText = [
    `Janela do plano (UTC): ${window.startDate} … ${window.endDate}`,
    `Snapshot do atleta (JSON):\n${JSON.stringify(input.snapshot)}`,
    continuity
      ? `Continuidade do plano anterior (JSON):\n${JSON.stringify(continuity)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  // generateContent with userText
  // validateSessionPlanResponse(parsed, { now })
  // SessionPlan.create with scheduledDate on each session, status open
}
```

Persist `scheduledDate` from the validated session onto each stored session.

- [ ] **Step 3: Smoke-check TypeScript on this file**

Run: `npx tsc --noEmit 2>&1 | head -40`

Fix any errors in this file from the new signature.

- [ ] **Step 4: Commit only if the user asked**

---

### Task 6: Wire continuity into snapshot / confirm / regenerate

**Files:**
- Modify: `src/services/snapshot/generateAthleteSnapshot.ts`
- Modify: `src/services/matching/confirmMatches.ts`

**Interfaces:**
- Consumes: `generateNextSessions` with `priorPlan`
- Produces:
  - `generateAthleteSnapshot(userId, options?: { priorPlan?: { sessions: ContinuityPlanSession[] } | null })`
  - `confirmMatches` passes the superseded plan document as `priorPlan`
  - `regenerateSessionPlanForUser` loads latest superseded plan for continuity

- [ ] **Step 1: Update `generateAthleteSnapshot`**

```ts
export async function generateAthleteSnapshot(
  userId: Types.ObjectId,
  options?: { priorPlan?: { sessions: ContinuityPlanSession[] } | null },
): Promise<void> {
  // ... existing snapshot create ...
  try {
    await generateNextSessions({
      userId,
      athleteSnapshotId: created._id,
      snapshot,
      priorPlan: options?.priorPlan ?? null,
    });
  } catch (error) {
    console.error("Failed to generate next sessions:", error);
  }
}
```

- [ ] **Step 2: Pass superseded plan from `confirmMatches`**

After `plan.status = "superseded"` and `plan.save()`, call:

```ts
await generateAthleteSnapshot(input.userId, {
  priorPlan: {
    sessions: plan.sessions.map((s) => ({
      order: s.order,
      title: s.title,
      type: s.type,
      purpose: s.purpose,
      scheduledDate: s.scheduledDate,
      coachingNotes: s.coachingNotes,
      segments: s.segments,
      status: s.status,
      activityId: s.activityId,
    })),
  },
});
```

(Use the in-memory plan after matches were applied so completed vs remaining is accurate.)

- [ ] **Step 3: Update `regenerateSessionPlanForUser`**

```ts
export async function regenerateSessionPlanForUser(
  userId: Types.ObjectId,
): Promise<void> {
  await dbConnect();
  const prior = await SessionPlan.findOne({
    userId,
    status: "superseded",
  })
    .sort({ createdAt: -1 })
    .lean();

  await generateAthleteSnapshot(userId, {
    priorPlan: prior
      ? {
          sessions: prior.sessions.map((s) => ({
            order: s.order,
            title: s.title,
            type: s.type,
            purpose: s.purpose,
            scheduledDate: s.scheduledDate,
            coachingNotes: s.coachingNotes,
            segments: s.segments,
            status: s.status,
            activityId: s.activityId,
          })),
        }
      : null,
  });
}
```

- [ ] **Step 4: Reject matching a rest session in `confirmMatches`**

When resolving `session` by order, if `session.type === "rest"`, throw `ConfirmMatchesError` with a clear message (e.g. `"Cannot match an activity to a rest day"`).

- [ ] **Step 5: Commit only if the user asked**

---

### Task 7: Exclude rest days from match suggestions / UI payload

**Files:**
- Modify: `src/services/strava/syncActivities.ts`
- Modify: `src/services/matching/types.ts` (`SyncOpenSessionSummary` add optional `scheduledDate`)
- Modify: `src/components/SyncActivitiesButton.tsx` (show date in dropdown; rest already excluded if API omits them)

**Interfaces:**
- Consumes: open sessions from plan
- Produces: match candidates = open && `type !== "rest"`

- [ ] **Step 1: Filter rest in sync match path**

Where open sessions are collected for matching, change to:

```ts
const openSessions = plan.sessions.filter(
  (s) => isSessionOpen(s) && s.type !== "rest",
);
```

Include `scheduledDate` on `SyncOpenSessionSummary` and when mapping sessions for the match-phase response:

```ts
sessions: openSessions.map((s) => ({
  order: s.order,
  title: s.title,
  type: s.type,
  scheduledDate: s.scheduledDate,
})),
```

- [ ] **Step 2: Show date in match dropdown**

In `SyncActivitiesButton.tsx`, render option text like:

```tsx
{session.order}. {session.scheduledDate} — {session.title} ({session.type})
```

Update local match-phase types if they duplicate `SyncOpenSessionSummary`.

- [ ] **Step 3: Commit only if the user asked**

---

### Task 8: Plan UI + serialize + docs

**Files:**
- Modify: `src/services/sessionPlans/types.ts`
- Modify: `src/services/sessionPlans/serialize.ts`
- Modify: `src/components/NextSessionsPlan.tsx`
- Modify: `src/components/SessionPlanDetails.tsx`
- Modify: `docs/activity-sync.md`

**Interfaces:**
- Produces: `PlannedSessionSummary.scheduledDate: string` always present for new plans

- [ ] **Step 1: Types + serialize**

```ts
export type PlannedSessionSummary = {
  order: number;
  scheduledDate: string;
  title: string;
  type: SessionType;
  // ...existing fields
};
```

In `toSession`, include `scheduledDate: session.scheduledDate`.

- [ ] **Step 2: Show dates in list + details**

In both components, include `session.scheduledDate` in the heading/meta line, e.g.:

```tsx
{session.scheduledDate} · {session.order}. {session.title}
```

For `type === "rest"`, skip distance formatting (already null) and optionally hide empty segments section (details already maps segments — rest has `[]`).

Update empty-state copy if it still says “next sessions” in a 3-pack sense — prefer “next week’s plan”.

- [ ] **Step 3: Update `docs/activity-sync.md`**

Add a short section:

- Open plans are a rolling 7-day week (UTC), one entry per day including `rest`
- Confirm ≥1 match supersedes and regenerates with continuity context (completed vs remaining) for the AI
- New plan stores only the upcoming week; rest days are not matchable

- [ ] **Step 4: Run unit tests**

Run:

```bash
npx tsx src/services/ai/planWindow.test.ts
npx tsx src/services/ai/buildContinuityContext.test.ts
npx tsx src/services/ai/validateSessionPlan.test.ts
npx tsx src/services/matching/scoreActivityToSession.test.ts
```

Expected: all print their `* tests passed` lines.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: exit 0

- [ ] **Step 6: Commit only if the user asked**

---

## Spec coverage checklist

| Spec requirement | Task |
| --- | --- |
| Rolling 7-day UTC window | 1, 4, 5 |
| Exactly 7 sessions, one per date | 3, 4 |
| `rest` type + empty segments | 3, 4 |
| `scheduledDate` on sessions | 3, 4, 8 |
| Soft continuity prompt payload | 2, 5, 6 |
| New plan upcoming-only | 5, 6 |
| Training count in rationale (prompt) | 5 |
| Match excludes rest | 6, 7 |
| UI shows dates | 7, 8 |
| Docs updated | 8 |
| No schema version bump | 3 (explicit non-change) |

## Self-review notes

- No TBD/placeholder steps
- Continuity types defined in Task 2 and reused by name in Tasks 5–6
- Validator takes `now` so tests are deterministic
- Commit steps deferred to user preference
