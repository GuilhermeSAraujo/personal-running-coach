# Sync Activities Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a logged-in home "Sync activities" button that POSTs to a stub API with loading and error UI.

**Architecture:** Keep `page.tsx` as a server component. Add a small client `SyncActivitiesButton` that fetches `POST /api/activities/sync`. The route checks `auth()` and returns `{ ok: true }` with no Strava/DB work.

**Tech Stack:** Next.js App Router route handlers, NextAuth `auth()`, Chakra UI v3 `Button` (`loading` / `loadingText`), React client component.

## Global Constraints

- Backend is a stub: no Strava calls, no database writes.
- Auth required: unauthenticated → `401`.
- Success is silent (no toast); failures show inline "Sync failed".
- No automated tests for this stub.
- Do not commit unless the user asks (project preference overrides frequent-commit plan default).

---

### Task 1: Stub API route

**Files:**
- Create: `src/app/api/activities/sync/route.ts`

**Interfaces:**
- Consumes: `auth` from `@/auth`
- Produces: `POST` handler → `401` without session, else `200` + `{ ok: true }`

- [x] **Step 1: Create the route handler**

```ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Stub: real Strava sync will land here later
  return NextResponse.json({ ok: true })
}
```

- [x] **Step 2: Verify file exists at the expected path**

Run: `test -f src/app/api/activities/sync/route.ts && echo OK`

---

### Task 2: SyncActivitiesButton client component

**Files:**
- Create: `src/components/SyncActivitiesButton.tsx`

**Interfaces:**
- Consumes: `POST /api/activities/sync`
- Produces: `<SyncActivitiesButton />` with loading + inline error

- [x] **Step 1: Create the client button**

```tsx
"use client"

import { useState } from "react"
import { Button, Text, VStack } from "@chakra-ui/react"

export function SyncActivitiesButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSync() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/activities/sync", { method: "POST" })
      if (!res.ok) {
        setError("Sync failed")
        return
      }
    } catch {
      setError("Sync failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <VStack gap={2} align="stretch" width="full">
      <Button
        colorPalette="orange"
        size="lg"
        width="full"
        loading={loading}
        loadingText="Syncing…"
        onClick={handleSync}
      >
        Sync activities
      </Button>
      {error ? (
        <Text textAlign="center" color="fg.error" fontSize="sm">
          {error}
        </Text>
      ) : null}
    </VStack>
  )
}
```

- [x] **Step 2: Verify export name**

Confirm export is `SyncActivitiesButton`.

---

### Task 3: Wire into home page

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `SyncActivitiesButton`
- Produces: button rendered only in the logged-in branch, above Sign Out

- [x] **Step 1: Import and render above Sign Out**

In the logged-in `VStack`, add `<SyncActivitiesButton />` before the sign-out form.

- [x] **Step 2: Manual check**

With a session: button visible, click shows loading, request hits stub, returns silently. Signed out: button not shown.

---
