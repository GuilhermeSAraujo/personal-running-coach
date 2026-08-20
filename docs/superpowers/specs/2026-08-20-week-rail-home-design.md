# Week Rail Home + Session Plan — Design

Date: 2026-08-20

## Goal

Rebuild the signed-in home (`/`) and session plan (`/session-plans/[id]`) around one shared object: **this week as a mobile-first rail of day cells**. Home shows done vs leftover, volume, a supporting coach caption, and a last-run strip. The plan page is the same rail with a selected day opened for purpose, segments, and notes.

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Home hero | This week as a board (done vs leftover + volume); coach note is supporting copy |
| Home extras | Compact last-run strip only; do not render progress history or longest/fastest |
| Plan page | Same rail on top; tap a day to open detail below |
| Canvas | Pastel field, black type, orange only for **next** and **done** |
| Layout | Mobile-first; rail snap-scrolls on phone, one row on desktop |
| Approach | Week rail (not done/leftover lanes, not a dashboard grid) |
| Metrics | Quiet **Metrics** text link in `AppNav`; remove the full-width **Training metrics** button |
| History | `getProgressFollowUp` still computes history; home does not render it |
| Models / matching / generation | Unchanged |
| Logged-out `/` | Not a redesign |
| Profile / `/metrics` content | Out of scope except shared tokens and the quieter metrics entry |

## Visual tokens

| Name | Hex | Role |
| --- | --- | --- |
| Track peach | `#F6EDE4` | Page background |
| Ink | `#141414` | Type, leftover outlines |
| Strava orange | `#FC4C02` | Next-session fill, done mark, focus ring |
| Orange ink | `#9A2E00` | Type on orange fill |
| Paper | `#FFF8F3` | Cell faces, last-run strip, detail panel |
| Quiet | `#6B625C` | Captions, rest days, secondary stats |

- **Display:** Newsreader — board volume (`12.4 / 42 km`) and the selected session title only.
- **UI:** IBM Plex Sans.
- **Data:** IBM Plex Mono — pace, km, segment rows.

Signature: the **next** cell is a solid orange ticket on an otherwise quiet peach rail. No stacked card chrome, no 01/02 markers, no dark dashboard.

Motion: rail uses CSS scroll-snap. Selection/orange state is instant. If `prefers-reduced-motion: reduce`, disable snap animation (scroll still works).

Apply tokens globally (Chakra system + fonts) so the app is one surface. Do not rebuild profile or metrics layouts in this work.

## Shared week rail

One cell per planned session, **schedule order** (`order` / `scheduledDate`). Skip `skipped` sessions (same as progress today). Do not invent empty calendar days.

### Board header

- Label: **This week**
- Volume: `actualKm / plannedKm` (Newsreader)
- Completion: `done / total` for **non-rest** sessions only

**Planned km:** for each non-rest session, if min and max exist use the midpoint; if only one bound exists use that bound; if neither exists skip that session in the planned sum. Round display to one decimal.

**Actual km:** sum `activity.distanceKm` for matched sessions that have an activity. Matched + `activityUnavailable` does not add actual km.

**Next:** first session in order with `status === "open"` and `type !== "rest"`. If none, there is no next ticket (week finished or only rest left).

**Done mark:** matched non-rest — thin orange mark on a paper cell (not a full orange fill). If planned and actual both exist and differ, show both on the cell (stacked, not two columns).

**Leftover:** open non-rest that is not next — ink outline, paper face.

**Rest:** muted type, no km, no orange.

### Responsive behavior

- **Phone (default):** horizontal scroll-snap. About 3–3.5 cells in the viewport. Header stacks: title, then volume, then `done/total`. Coach caption and last-run strip are full width below. All actions work with tap (no hover-only).
- **Desktop:** all cells in one row; header on one line. Caption and last-run stay stacked full width under the rail (same order as phone).

Home cells are links to `/session-plans/[planId]?session=[order]`. On the plan page, tapping a cell only changes selection.

## Home (`/` signed-in)

1. `AppNav` (existing actions: name, sync, profile, sign out) plus a quiet **Metrics** link.
2. Week rail + header (or empty board frame if no open plan).
3. Coach caption under the rail (existing `/api/daily-coach-message` load + refresh; restyle from card to caption). Hidden when onboarding is required, same as today.
4. Last-run strip from `highlights.last`: distance, pace, duration, date.
5. `OnboardingModal` unchanged.

Remove from home: `ProgressHistory`, longest/fastest rows, full-width metrics button, stacked progress card rows.

## Session plan (`/session-plans/[id]`)

Auth and missing plan unchanged: signed-out → `/`; unknown id → `notFound()`.

1. Back to home.
2. Same week rail + volume header. Rationale is a caption under the rail (same role as the coach note on home).
3. Detail panel for the selected session:
   - Title (Newsreader), type, planned km / pace
   - If matched: planned vs actual in the panel header
   - Purpose
   - Segments as a vertical mono recipe: kind, repeat, distance or duration, pace (existing `formatSegmentSummary` is the data; restyle, don’t rewrite copy rules)
   - Coaching notes below segments when present
4. Rest: short rest panel, no segments recipe.
5. Matched + activity missing: planned numbers + **Activity unavailable**.

**Selection:** `?session=<order>` (the planned session `order` field).

- Valid order that exists on this plan (and is not skipped) → select it.
- Missing or invalid → first open non-rest (**next**).
- If no next → last matched **non-rest** session in order.
- If still none → first remaining session (e.g. all rest).

Changing selection updates the query (shareable URL). No extra routes.

## Data

### Home

Keep `getProgressFollowUp` and `getActivityHighlights`. Feed the rail from `progress.thisWeek`. Last-run strip uses `highlights.last` only.

Add a pure helper (e.g. `weekBoardStats(sessions)`) for actual/planned km, done/total, and next order. No new models.

### Plan page

Keep `getSessionPlanForUser`. **Join matched activities** onto sessions (same activity summary as progress: `distanceKm`, `durationSeconds`, `paceSecondsPerKm`, `startedAt`) so the rail and detail can show planned vs actual. Orphan `activityId` → `activityUnavailable`.

Do not change plan generation, matching, or snapshot code.

## Components (new / restyle)

| Piece | Role |
| --- | --- |
| `WeekRail` | Shared cells + header; home uses links, plan page uses selection |
| `weekBoardStats` | Pure stats from session list |
| Coach caption | `DailyCoachMessage` restyled |
| Last-run strip | Compact last activity |
| Session detail panel | Purpose, segments, notes |
| Theme tokens + fonts | Peach/ink/orange + Newsreader / Plex |

Existing `ProgressThisWeek` / `ProgressSessionRow` / `ProgressHistory` / `ActivityHighlights` / `SessionPlanDetails` are replaced on these two routes. Leave unused files only if still imported elsewhere; otherwise delete in the implementation pass.

## Empty and error copy

| State | UI |
| --- | --- |
| No open plan | Rail frame + “Sync activities to generate this week’s plan.” |
| No last run | Strip + “No runs yet.” Sync remains in nav. |
| Coach loading | Caption: existing generating copy |
| Coach error | Caption + retry (existing refresh) |
| Coach empty | Hide caption (same as today) |
| Activity unavailable | Planned stats + “Activity unavailable.” |

Do not apologize. Say what happened and what to do.

## Tests

- `weekBoardStats`: midpoint planned km; rest excluded from volume and done/total; next = first open non-rest; unavailable match does not add actual km; no next when all non-rest are matched.
- Plan selection default: valid query; invalid query → next; no next → last matched non-rest.
- Activity join on the plan loader: matched session includes activity summary; orphan id sets `activityUnavailable`.

UI: `tsc` + manual phone and desktop check. No rewrite of `getProgressFollowUp` tests except if the DTO grows a field the helper needs (prefer deriving in the helper from existing fields).

## Explicit non-goals

- Rebuilding `/metrics`, `/profile`, or the logged-out welcome
- Rendering progress history on home (service may keep computing it)
- Hit/miss scoring, match editing, skipped-session UI
- Horizontal planned vs actual columns
- New API routes for the board
- Dark theme as a first-class canvas
