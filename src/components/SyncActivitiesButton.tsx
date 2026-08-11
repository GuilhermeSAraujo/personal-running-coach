"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Button, HStack, Text, VStack } from "@chakra-ui/react"
import {
  formatActivityDate,
  formatDistanceKm,
  formatDuration,
  formatPace,
} from "@/lib/activityFormat"
import type {
  MatchSuggestion,
  SyncActivitySummary,
  SyncOpenSessionSummary,
} from "@/services/matching/types"

type MatchPhaseState = {
  sessionPlanId: string
  activities: SyncActivitySummary[]
  sessions: SyncOpenSessionSummary[]
  suggestions: MatchSuggestion[]
}

/** Empty string means "Not in plan". */
type AssignmentMap = Record<string, string>

type FeedbackMap = Record<string, { effort: string; notes: string }>

function buildInitialAssignments(phase: MatchPhaseState): AssignmentMap {
  const map: AssignmentMap = {}
  const suggestionByActivity = new Map(
    phase.suggestions.map((s) => [s.activityId, String(s.sessionOrder)]),
  )
  for (const activity of phase.activities) {
    map[activity.id] = suggestionByActivity.get(activity.id) ?? ""
  }
  return map
}

function buildInitialFeedback(phase: MatchPhaseState): FeedbackMap {
  const map: FeedbackMap = {}
  for (const activity of phase.activities) {
    map[activity.id] = { effort: "", notes: "" }
  }
  return map
}

function suggestionReason(
  activityId: string,
  suggestions: MatchSuggestion[],
): string | null {
  const suggestion = suggestions.find((s) => s.activityId === activityId)
  if (!suggestion?.reasons.length) return null
  return suggestion.reasons.join(" · ")
}

type SyncActivitiesButtonProps = {
  compact?: boolean
  /** Shown on the left of the compact nav row (e.g. home link). */
  leading?: ReactNode
  /** Shown next to the compact Sync button (e.g. Sign Out). */
  trailing?: ReactNode
}

export function SyncActivitiesButton({
  compact = false,
  leading,
  trailing,
}: SyncActivitiesButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [matchPhase, setMatchPhase] = useState<MatchPhaseState | null>(null)
  const [assignments, setAssignments] = useState<AssignmentMap>({})
  const [feedback, setFeedback] = useState<FeedbackMap>({})
  const [needsRegenRetry, setNeedsRegenRetry] = useState(false)

  const usedSessionOrders = useMemo(() => {
    const used = new Set<string>()
    for (const value of Object.values(assignments)) {
      if (value) used.add(value)
    }
    return used
  }, [assignments])

  async function handleSync() {
    setLoading(true)
    setError(null)
    setMessage(null)
    setNeedsRegenRetry(false)
    try {
      const res = await fetch("/api/activities/sync", { method: "POST" })
      const data = (await res.json().catch(() => null)) as
        | ({ ok?: boolean; phase?: string } & Partial<MatchPhaseState>)
        | null
      if (!res.ok) {
        setError("Sync failed")
        return
      }
      if (
        data?.phase === "match" &&
        typeof data.sessionPlanId === "string" &&
        Array.isArray(data.activities) &&
        Array.isArray(data.sessions)
      ) {
        const phase: MatchPhaseState = {
          sessionPlanId: data.sessionPlanId,
          activities: data.activities,
          sessions: data.sessions,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        }
        setMatchPhase(phase)
        setAssignments(buildInitialAssignments(phase))
        setFeedback(buildInitialFeedback(phase))
        return
      }
      setMatchPhase(null)
      router.refresh()
    } catch {
      setError("Sync failed")
    } finally {
      setLoading(false)
    }
  }

  function handleSkipMatching() {
    setMatchPhase(null)
    setAssignments({})
    setFeedback({})
    setMessage("Activities saved. Plan unchanged.")
    router.refresh()
  }

  async function handleConfirm() {
    if (!matchPhase) return
    setConfirming(true)
    setError(null)
    setMessage(null)
    try {
      const matches = matchPhase.activities.map((activity) => {
        const raw = assignments[activity.id] ?? ""
        const fb = feedback[activity.id] ?? { effort: "", notes: "" }
        const notes = fb.notes.trim()
        return {
          activityId: activity.id,
          sessionOrder: raw === "" ? null : Number(raw),
          ...(fb.effort ? { effort: fb.effort } : {}),
          ...(notes ? { notes } : {}),
        }
      })

      const res = await fetch("/api/session-plans/confirm-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionPlanId: matchPhase.sessionPlanId,
          matches,
        }),
      })
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        matchesSaved?: boolean
        regenerated?: boolean
        matchedCount?: number
      } | null

      if (data?.error === "plan_regen_failed" && data.matchesSaved) {
        setMatchPhase(null)
        setNeedsRegenRetry(true)
        setError("Activities saved, but generating the next plan failed.")
        return
      }

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Confirm failed")
        return
      }

      setMatchPhase(null)
      setFeedback({})
      router.refresh()
    } catch {
      setError("Confirm failed")
    } finally {
      setConfirming(false)
    }
  }

  async function handleRetryRegen() {
    setRetrying(true)
    setError(null)
    try {
      const res = await fetch("/api/session-plans/regenerate", {
        method: "POST",
      })
      if (!res.ok) {
        setError("Failed to generate plan")
        return
      }
      setNeedsRegenRetry(false)
      setMessage(null)
      router.refresh()
    } catch {
      setError("Failed to generate plan")
    } finally {
      setRetrying(false)
    }
  }

  function setAssignment(activityId: string, value: string) {
    setAssignments((prev) => {
      const next = { ...prev }
      // Free the previously selected session if another activity takes it.
      if (value) {
        for (const [id, order] of Object.entries(next)) {
          if (id !== activityId && order === value) {
            next[id] = ""
          }
        }
      }
      next[activityId] = value
      return next
    })
  }

  function setActivityEffort(activityId: string, effort: string) {
    setFeedback((prev) => ({
      ...prev,
      [activityId]: {
        effort,
        notes: prev[activityId]?.notes ?? "",
      },
    }))
  }

  function setActivityNotes(activityId: string, notes: string) {
    setFeedback((prev) => ({
      ...prev,
      [activityId]: {
        effort: prev[activityId]?.effort ?? "",
        notes,
      },
    }))
  }

  const syncButton = (
    <Button
      colorPalette="orange"
      size={compact ? "sm" : "lg"}
      width={compact ? "auto" : "full"}
      loading={loading}
      loadingText="Syncing…"
      onClick={handleSync}
      disabled={confirming || retrying}
    >
      Sync activities
    </Button>
  )

  return (
    <VStack gap={3} align="stretch" width="full">
      {compact ? (
        <HStack justify="space-between" align="center" width="full" gap={3}>
          {leading}
          <HStack gap={2} align="center" flexShrink={0}>
            {syncButton}
            {trailing}
          </HStack>
        </HStack>
      ) : (
        syncButton
      )}

      {matchPhase ? (
        <VStack
          gap={3}
          align="stretch"
          width="full"
          borderWidth="1px"
          borderColor="border"
          rounded="md"
          p={3}
        >
          <Text fontSize="sm" fontWeight="semibold">
            Match new activities to your plan
          </Text>

          {matchPhase.activities.map((activity) => {
            const reason = suggestionReason(
              activity.id,
              matchPhase.suggestions,
            )
            const selected = assignments[activity.id] ?? ""
            const activityFeedback = feedback[activity.id] ?? {
              effort: "",
              notes: "",
            }
            const controlStyle = {
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid var(--chakra-colors-border)",
              background: "transparent",
              fontSize: "14px",
            } as const
            return (
              <VStack key={activity.id} gap={1} align="stretch">
                <Text fontSize="sm" fontWeight="medium">
                  {formatActivityDate(activity.startedAt)} ·{" "}
                  {formatDistanceKm(activity.distanceKm)} ·{" "}
                  {formatDuration(activity.durationSeconds)} ·{" "}
                  {formatPace(activity.paceSecondsPerKm)}
                </Text>
                <select
                  value={selected}
                  onChange={(e) => setAssignment(activity.id, e.target.value)}
                  style={controlStyle}
                >
                  <option value="">Not in plan</option>
                  {matchPhase.sessions.map((session) => {
                    const order = String(session.order)
                    const taken =
                      usedSessionOrders.has(order) && selected !== order
                    return (
                      <option key={session.order} value={order} disabled={taken}>
                        {session.scheduledDate} · {session.order}. {session.title}{" "}
                        ({session.type})
                      </option>
                    )
                  })}
                </select>
                {reason && selected === String(
                  matchPhase.suggestions.find((s) => s.activityId === activity.id)
                    ?.sessionOrder,
                ) ? (
                  <Text fontSize="xs" color="fg.muted">
                    {reason}
                  </Text>
                ) : null}
                <select
                  value={activityFeedback.effort}
                  onChange={(e) =>
                    setActivityEffort(activity.id, e.target.value)
                  }
                  style={controlStyle}
                  aria-label="How hard was this activity"
                >
                  <option value="">Effort (optional)</option>
                  <option value="too_easy">Too easy</option>
                  <option value="about_right">About right</option>
                  <option value="too_hard">Too hard</option>
                </select>
                <textarea
                  value={activityFeedback.notes}
                  onChange={(e) =>
                    setActivityNotes(activity.id, e.target.value)
                  }
                  placeholder="How did it feel?"
                  rows={2}
                  style={{
                    ...controlStyle,
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </VStack>
            )
          })}

          <VStack gap={2} align="stretch">
            <Button
              colorPalette="orange"
              loading={confirming}
              loadingText="Confirming…"
              onClick={handleConfirm}
              disabled={loading}
            >
              Confirm
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkipMatching}
              disabled={confirming || loading}
            >
              Skip matching
            </Button>
          </VStack>
        </VStack>
      ) : null}

      {needsRegenRetry ? (
        <Button
          colorPalette="orange"
          variant="outline"
          loading={retrying}
          loadingText="Generating…"
          onClick={handleRetryRegen}
        >
          Retry generate plan
        </Button>
      ) : null}

      {error ? (
        <Text textAlign="center" color="fg.error" fontSize="sm">
          {error}
        </Text>
      ) : null}
      {message ? (
        <Text textAlign="center" color="fg.muted" fontSize="sm">
          {message}
        </Text>
      ) : null}
    </VStack>
  )
}
