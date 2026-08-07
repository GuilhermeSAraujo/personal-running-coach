# Onboarding Time Input Mask — Design

Date: 2026-08-06

## Goal

Let users enter race/5K times on mobile numeric keyboards (no `:`) by auto-inserting colons as they type digits. Fixes validation failures when users enter values like `3500` instead of `35:00`.

## Problem

Both time fields in `OnboardingModal` use `inputMode="numeric"`. Mobile number pads lack `:`, so users cannot type the format `parseDurationToSeconds` expects (`mm:ss` or `h:mm:ss`).

## Approach

Small pure mask helpers (no new dependencies). Strip non-digits on change, format with colons, keep existing `parseDurationToSeconds` as the submit-time source of truth.

## Behavior

### Current 5K time (step 2)

- Cap: 4 digits (always under 1 hour).
- Format: fixed `mm:ss`. Left-pad digit string to 4 with `0`, then split `mm` / `ss`.
- Examples:
  - `2` → `00:02`
  - `28` → `00:28`
  - `280` → `02:80` (mid-type; submit still rejects invalid seconds via `parseDurationToSeconds`)
  - `2800` → `28:00`
  - `28001` → `28:00` (extra digits dropped)
- Empty input stays empty (do not force `00:00` when blank).

### Target time (step 1)

- Cap: 5 digits (supports up to `9:59:59`; enough for marathon targets).
- Format: right-aligned (seconds are the last two digits).
- Digit → display rules:
  - 1–2 digits: show digits as-is (`35` → `35`)
  - 3–4 digits: last 2 = seconds, remainder = minutes (`350` → `3:50`, `3500` → `35:00`)
  - 5 digits: last 2 = seconds, previous 2 = minutes, remainder = hours (`21500` → `2:15:00`)
  - 6+ digits: keep first 5 only
- Empty input stays empty.

### Shared input behavior

- Keep `inputMode="numeric"` and `autoComplete="off"`.
- On change: strip non-digits → apply mask → set state.
- Placeholders can stay as formatted examples (`e.g. 28:00`, `e.g. 30:00 or 2:15:00`); masked typing makes them reachable without typing `:`.
- Submit validation and error copy unchanged (`parseDurationToSeconds`).

## Implementation

### New util

- **File:** `src/lib/timeInputMask.ts` (or colocated helpers if preferred — prefer shared lib for testability)
- Exports:
  - `maskMmSs(raw: string): string` — 5K field
  - `maskDurationRightAligned(raw: string): string` — target time field
- Both take the raw `input` value, return the masked display string.

### Wire-up

- **File:** `src/components/OnboardingModal.tsx`
- Target time `onChange` → `setTargetTime(maskDurationRightAligned(e.target.value))`
- Current 5K `onChange` → `setCurrent5kTime(maskMmSs(e.target.value))`

### Tests

- Unit tests for both mask helpers covering empty, partial, full, and over-length digit strings; non-digit stripping.

## Out of scope

- Cursor position preservation while editing mid-string (accept end-of-field typing UX)
- Masking other duration UIs outside onboarding
- Changing API payload / `parseDurationToSeconds` contract
- Separate hour/minute/second inputs
- Third-party mask libraries
