# Onboarding Modal — Design

Date: 2026-08-04

## Goal

Collect the athlete’s race goal and optional profile details after Strava sign-in, before they can use the app. Persist a complete `goal` (with smart defaults) and any provided profile fields on the `User` document.

## Approach

Blocking, mobile-first Chakra UI v3 Dialog (two steps). Client `fetch` to `PATCH /api/user/onboarding`. Server applies amateur defaults when target time or race date are omitted. Home page loads the user and opens the modal when `goal.type` is missing.

## Behavior

- **Incomplete onboarding:** signed-in user with no `goal.type`.
- **Blocking:** no close button; no outside-click or Escape dismiss.
- **Mobile-first:** near full-screen dialog, large tap targets, sticky footer CTA.
- **Two steps:** Goal → Profile.
- **Required in UI:** goal type only.
- **Optional:** target time, race date, height, weight, birth date, current 5K time, longest run — each with short helper copy explaining how the data helps coaching.
- Metric units only (cm, kg).

## Defaults (server-applied when omitted)

| Goal | Default target time | Default race date |
| --- | --- | --- |
| 5k | 30:00 (1800s) | +3 months |
| 10k | 60:00 (3600s) | +3 months |
| half_marathon | 2:15:00 (8100s) | +4 months |
| marathon | 4:30:00 (16200s) | +5 months |

`distanceKm` is always derived from `GOAL_DISTANCE_KM[type]`. Saved documents always include full `goal` (`type`, `distanceKm`, `targetTimeSeconds`, `targetDate`). Profile keys are only `$set` when the user provided them.

## UI

### Step 1 — Goal

- Goal type selectable options: 5K, 10K, Half marathon, Marathon (required).
- Optional target time and race date with helpers; when blank, show preview of the defaults that will be used.
- Next disabled until a type is selected.

### Step 2 — Profile

- Optional: height (cm), weight (kg), birth date, current 5K time, longest run (km).
- Per-field “why this helps” helpers.
- Back + Finish.

### Home wiring

Server `page.tsx` loads User by `session.stravaAthleteId`, passes `needsOnboarding` into client `OnboardingModal`. Sync / Sign out remain behind the modal while open.

## API

- **Method / path:** `PATCH /api/user/onboarding`
- **File:** `src/app/api/user/onboarding/route.ts`
- **Auth:** `auth()`; require `session.stravaAthleteId`
- **Body:** `{ goal: { type, targetTimeSeconds?, targetDate? }, profile?: { heightCm?, weightKg?, birthDate?, current5kTime?, longestRunKm? } }`
- **Success:** `200` `{ ok: true }`
- **Errors:** `401` unauthorized, `400` invalid input, `404` user missing, `500` unexpected

## Client component

- **File:** `src/components/OnboardingModal.tsx` (`"use client"`)
- Controlled `Dialog.Root` with `open={needsOnboarding}`
- On Finish: PATCH, loading state, inline error; success → `router.refresh()`

## Shared helper

- **File:** `src/lib/onboardingDefaults.ts`
- Exports default maps and `resolveGoalFields(type, overrides?)`

## Out of scope

- Later profile editing UI
- Imperial units
- Toasts
- Auth.js adapter changes
- Automated tests (manual verification)
