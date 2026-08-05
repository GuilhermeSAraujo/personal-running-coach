# Sync Activities Button — Design

Date: 2026-08-04

## Goal

Add a logged-in home-screen control that triggers activity sync via the Next.js backend. The backend is a stub for now (no Strava fetch, no DB writes).

## Approach

Client `fetch` to a dedicated API route, with button loading state. Keeps `page.tsx` as a server component and matches a future long-running sync.

## UI

- Shown only when the user has a session, above the Sign Out control.
- Full-width Chakra button labeled **Sync activities**.
- While the request is in flight: button disabled, loading indicator, label **Syncing…**.
- On failure: short inline error under the button (e.g. "Sync failed"). Clear loading.
- On success: silent (no toast); clear loading. Backend is a no-op.

## API

- **Method / path:** `POST /api/activities/sync`
- **File:** `src/app/api/activities/sync/route.ts`
- **Auth:** Call `auth()`. If no session, return `401`.
- **Request body:** None required.
- **Success:** `200` with `{ ok: true }`.
- **Behavior:** No Strava calls, no database work.

## Client component

- **File:** `src/components/SyncActivitiesButton.tsx` (`"use client"`)
- On click: `fetch("/api/activities/sync", { method: "POST" })`
- Manage `loading` and `error` local state around the request
- Wire into `src/app/page.tsx` inside the logged-in branch

## Out of scope

- Fetching or upserting Strava activities
- Progress beyond button loading
- Toasts / success messaging
- Automated tests (unless added later)

## Files

| Piece | Path |
|---|---|
| Client button | `src/components/SyncActivitiesButton.tsx` |
| Stub API | `src/app/api/activities/sync/route.ts` |
| Home wiring | `src/app/page.tsx` |
