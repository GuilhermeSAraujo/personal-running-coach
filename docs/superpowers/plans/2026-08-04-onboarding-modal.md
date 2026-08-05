# Onboarding Modal Implementation Plan

> Saved copy of the approved plan for repo history. Source of truth during execution was the Cursor plan.

**Goal:** Gate the logged-in home experience behind a blocking two-step onboarding Dialog until the user has a `goal.type`, saving profile + goal with smart defaults.

**Architecture:** Server `page.tsx` loads the User and passes `needsOnboarding`. A client `OnboardingModal` collects Goal then Profile and `PATCH`es `/api/user/onboarding`. The API validates, applies defaults from a shared helper, and `$set`s `goal` plus any provided profile fields. On success, `router.refresh()` clears the gate.

See also: [`../specs/2026-08-04-onboarding-modal-design.md`](../specs/2026-08-04-onboarding-modal-design.md)

## Delivered

- [x] Design spec + `src/lib/onboardingDefaults.ts` + `src/lib/goal.ts`
- [x] `PATCH /api/user/onboarding`
- [x] Blocking mobile-first `OnboardingModal`
- [x] Home page gate via `needsOnboarding`
- [x] `tsc` + `next build` verification
