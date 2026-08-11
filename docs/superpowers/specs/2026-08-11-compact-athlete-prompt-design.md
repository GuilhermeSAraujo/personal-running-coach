# Compact Athlete Snapshot Prompt — Design

Date: 2026-08-11

## Goal

Improve LLM plan quality and reduce prompt noise by sending a single compact labeled-text athlete context instead of raw `JSON.stringify(snapshot)`, while keeping the rich Mongo snapshot for derivation/debug and persisting the compact text for inspection.

## Decisions

- Rich `IAthleteSnapshot` remains the source of truth in Mongo (no schema slim/migration).
- Optional `promptText` on `AthleteSnapshot` stores the compact athlete body for debug.
- Format-at-generate: build compact text in `generateNextSessions`, `$set` on the snapshot, send **only** that body to the LLM (never rich JSON, never a second preset dump).
- Format: labeled text sections (`ATHLETE`, `GOAL`, `CURRENT_STATE`, …).
- Continuity is a separate trailing compact text block (not stored in `promptText`).

## Architecture

```text
buildAthleteSnapshot → rich snapshot → AthleteSnapshot.create
                         ↓
              derivePaceGuardrails
                         ↓
         formatCompactSnapshotForPrompt → promptText
                         ↓
         AthleteSnapshot.updateOne($set promptText)
                         ↓
         user prompt = window + promptText + optional continuity
                         ↓
                      Gemini
```

## Compact `promptText` sections

Built by `formatCompactSnapshotForPrompt(snapshot, paceGuards | null)`:

1. **ATHLETE** — age, weight, height, lifetime runs/distance; omit metadata (`schemaVersion`, `generatedAt`, window ISO).
2. **GOAL** — type, distance km, target time as clock string, target date `YYYY-MM-DD`, weeks remaining.
3. **CURRENT_STATE** — rounded aggregates from `currentState`; trends; hrCoverage %.
4. **PERFORMANCE** — PBs as clock times from `historicalPerformance.personalBests`; longest run; optional recent effort HR. Do not dump full `bestEfforts` objects.
5. **RECENT_WEEKS** — last **4** weeks only, compact lines.
6. **RECENT_ACTIVITIES** — up to **8** runs: date, km, pace min/km, optional avg HR / suffer / feedback effort.
7. **PACE_RULES** — from derived guards in min/km (replaces standalone pace-guard prompt block).
8. **TRAINING_PRESET** or adaptive one-liner — weekday roles + short rules only (no name/summary/philosophy).

Rounding: km 1 decimal, pace min/km 2 decimals, HR/elev/suffer integers, durations as clock or whole minutes.

## Continuity

`formatContinuityForPrompt(ctx)` → labeled text with completed vs remaining sessions (date, type, title, purpose, segment one-liners, notes). Not part of stored `promptText`.

## Prompt assembly

```text
Janela do plano (UTC): start … end

{promptText}

{optional PLAN_CONTINUITY block}
```

System instruction references labeled sections and min/km; no “convert seconds/km from snapshot JSON” guidance.

## Out of scope

- Slimming the rich stored snapshot schema
- UI to view `promptText`
- Changing response schema or pace-guard assertion math
