# Activity Highlights on Home — Design

Date: 2026-08-04

## Goal

Show the logged-in athlete three activity highlights on the home screen: last, longest, and fastest (best pace), computed across runs and walks. Expose the same data via a GET API for reuse.

## Approach

Shared service `getActivityHighlights(userId)` owns the Mongo queries. The Home Server Component calls it directly for first paint. `GET /api/activities/highlights` wraps auth, resolves the User, and returns the same payload. After a successful Strava sync, the client calls `router.refresh()` so the RSC reloads highlights.

## Decisions

- Combined across `run` and `walk` (not split by type)
- Fastest = lowest `paceSecondsPerKm` among activities with `distanceKm >= 1`
- Summary shape only (no `raw` or other heavy fields)
- Endpoint path: `/api/activities/highlights` (not dashboard-*)
- Same activity may appear in more than one slot

## Data contract

```ts
type ActivitySummary = {
  id: string
  type: "run" | "walk"
  startedAt: string // ISO
  distanceKm: number
  durationSeconds: number
  paceSecondsPerKm: number
}

type ActivityHighlights = {
  last: ActivitySummary | null
  longest: ActivitySummary | null
  fastest: ActivitySummary | null
}
```

Queries (per `userId`, lean, limit 1):

| Slot | Sort | Filter |
| --- | --- | --- |
| `last` | `startedAt: -1` | — |
| `longest` | `distanceKm: -1` | — |
| `fastest` | `paceSecondsPerKm: 1` | `distanceKm >= 1` |

## API

- **Method / path:** `GET /api/activities/highlights`
- **File:** `src/app/api/activities/highlights/route.ts`
- **Auth:** `auth()`; require `session.stravaAthleteId`
- **Success:** `200` with `ActivityHighlights` body
- **Errors:** `401` unauthorized, `404` user missing, `500` unexpected

## Service

- **File:** `src/services/activities/highlights.ts`
- Caller must `dbConnect()` first (or service connects itself consistently with other services — sync connects inside; highlights may connect inside or rely on caller; prefer connect inside service for API safety, page already connects)

## UI

- **File:** `src/components/ActivityHighlights.tsx` (server-friendly presentational)
- Rows: Last activity, Longest, Fastest — distance, type, date, pace, duration as specified in plan
- All null: muted “No activities yet. Sync from Strava to get started.”
- Partial null: “—” for that row’s body
- **Format helpers:** `src/lib/activityFormat.ts`
- Home places highlights under greeting, before Sync
- **Sync:** `SyncActivitiesButton` calls `router.refresh()` on success

## Out of scope

- Per-type split stats
- Charts / activity detail pages
- New Mongo indexes for distance/pace sorts
- Automated tests (manual verification)
