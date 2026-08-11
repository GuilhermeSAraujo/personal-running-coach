# Metrics Dashboard — Design

Date: 2026-08-10

## Goal

Give the athlete a mobile-first **`/metrics`** screen that visualizes training trends from the latest `AthleteSnapshot`: weekly volume, consistency, long-run progression, and pace trend — plus a compact KPI strip — with a home CTA to open it.

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Route | New `/metrics`; home button **Training metrics** navigates there |
| Data source | Latest `AthleteSnapshot` only (snapshot-first); no live Activity aggregation |
| KPIs | Yes — 2×2 strip from `currentState` |
| Charts | Weekly volume (km), consistency (runs/week), long run (km), pace trend (avg sec/km) |
| Chart stack | `@chakra-ui/charts` (`Chart` + `useChart`) + `recharts` |
| Layout | Mobile-first single column; `Container maxW="md"` |
| Snapshot refresh | Out of scope on this page; Sync remains in `AppNav` |
| Tests | Service unit tests only; UI via `tsc` + manual check |

## Page structure

### Home (signed-in)

Add a full-width button **Training metrics** linking to `/metrics`, placed in the Progress intro area (near the Progress heading / before This week). Does not replace session progress lists.

### `/metrics` (signed-in)

1. `AppNav` (same as home)
2. Title + muted subtitle (“Last 12 weeks from your latest snapshot”)
3. Muted “Updated …” line from `generatedAt` when a snapshot exists
4. **KPI strip** — `SimpleGrid columns={2}`:
   - Current week volume (`currentState.weeklyVolumeKm.currentWeek`)
   - Runs/week 4w (`currentState.frequency.averageRunsPerWeek4w`)
   - Longest run (`currentState.longRun.currentLongestKm`)
   - Pace trend label (`currentState.trends.pace` → improving / stable / declining / —)
5. **Four stacked chart cards** (title + one supporting line + chart ~200–240px):
   - Weekly volume — Recharts `BarChart` on `distanceKm`
   - Consistency — `BarChart` on `runs`
   - Long run — `LineChart` (or bar) on `longestRunKm`
   - Pace trend — `LineChart` on `averagePaceSecondsPerKm`; tooltip/ticks formatted as `m:ss`/km; **reversed Y domain** so faster (lower sec/km) plots higher
6. **Empty state** when no snapshot: short copy; Sync available in nav; hide KPI strip and charts

### Auth

Unauthenticated: same welcome / Connect with Strava gate as home (no metrics fetch).

## Data assembly

`getMetricsDashboard(userId)`:

1. `AthleteSnapshot.findOne({ userId }).sort({ createdAt: -1 }).lean()`
2. If missing → `{ empty: true }`
3. Else map:
   - `generatedAt`
   - `kpis` from `currentState` (fields above)
   - `weeks`: each `recentTraining.weeks[]` → `{ weekStart, label, distanceKm, runs, longestRunKm, averagePaceSecondsPerKm? }`
4. Return a serializable DTO safe for client chart props (ISO strings for dates)

Zero-activity weeks stay in the series with `0` for volume/runs/longest so the 12-week axis is continuous. Weeks without pace keep `averagePaceSecondsPerKm` unset/`null`; the pace chart gaps those points.

## Components & files

| File | Responsibility |
| --- | --- |
| `src/services/metrics/types.ts` | DTO types |
| `src/services/metrics/getMetricsDashboard.ts` | Snapshot → DTO |
| `src/services/metrics/getMetricsDashboard.test.ts` | Empty + happy-path mapping |
| `src/app/metrics/page.tsx` | Auth, fetch, compose |
| `src/components/metrics/MetricsKpiStrip.tsx` | 2×2 KPI grid |
| `src/components/metrics/WeeklyVolumeChart.tsx` | Client bar chart |
| `src/components/metrics/ConsistencyChart.tsx` | Client bar chart |
| `src/components/metrics/LongRunChart.tsx` | Client line/bar chart |
| `src/components/metrics/PaceTrendChart.tsx` | Client line chart + pace formatters |
| `src/components/metrics/MetricsEmptyState.tsx` | No-snapshot UI |
| `src/app/page.tsx` | Add Training metrics button |
| `package.json` | Add `@chakra-ui/charts`, `recharts` |

Pace display helper (e.g. `formatPaceMinPerKm`) lives under `src/components/metrics/` unless a shared `src/lib` formatter already exists at implementation time.

Chart convention: `useChart({ data, series })` + `Chart.Root`; Recharts `responsive` prop (not `ResponsiveContainer`); compact X ticks (e.g. `M/D`); Chakra semantic colors via `chart.color(...)`.

## Edge cases

- Missing pace trend on snapshot → KPI shows `—`
- Soft page-level error copy on unexpected DB failures (no blank crash)
- Stale snapshot is expected; surface `generatedAt` only

## Explicit non-goals (v1)

Live Activity aggregation; regenerate snapshot from `/metrics`; HR / suffer-score charts; goal-distance PB cards; desktop multi-column chart grid; component-level UI test harness.
