"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Button,
  Dialog,
  Field,
  Input,
  Portal,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { GOAL_LABELS, GOAL_TYPES, type GoalType } from "@/lib/goal"
import {
  DEFAULT_PREP_MONTHS,
  DEFAULT_TARGET_TIME_SECONDS,
  formatDurationLabel,
} from "@/lib/onboardingDefaults"
import { getTrainingPreset } from "@/lib/trainingPresets"
import type { TrainingStyle } from "@/lib/trainingStyle"
import {
  maskDurationRightAligned,
  maskMmSs,
} from "@/lib/timeInputMask"

function parseDurationToSeconds(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parts = trimmed.split(":").map((p) => p.trim())
  if (parts.length < 2 || parts.length > 3) return undefined
  if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return undefined

  const nums = parts.map(Number)
  let hours = 0
  let minutes = 0
  let seconds = 0
  if (nums.length === 2) {
    ;[minutes, seconds] = nums
  } else {
    ;[hours, minutes, seconds] = nums
  }

  if (minutes > 59 || seconds > 59) return undefined
  const total = hours * 3600 + minutes * 60 + seconds
  return total > 0 ? total : undefined
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n
}

export function OnboardingModal({ open }: { open: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [goalType, setGoalType] = useState<GoalType | null>(null)
  const [trainingStyle, setTrainingStyle] = useState<TrainingStyle | null>(
    null,
  )
  const [targetTime, setTargetTime] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [current5kTime, setCurrent5kTime] = useState("")
  const [longestRunKm, setLongestRunKm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultPreview = useMemo(() => {
    if (!goalType) return null
    const seconds = DEFAULT_TARGET_TIME_SECONDS[goalType]
    const months = DEFAULT_PREP_MONTHS[goalType]
    return {
      timeLabel: formatDurationLabel(seconds),
      months,
    }
  }, [goalType])

  const preset = useMemo(
    () => (goalType ? getTrainingPreset(goalType) : null),
    [goalType],
  )

  const stepTitle =
    step === 1
      ? "What’s your goal?"
      : step === 2
        ? "How should we coach you?"
        : "Tell us about you"

  const stepDescription =
    step === 1
      ? "Pick a race distance. Time and date are optional — we’ll fill sensible amateur defaults if you skip them."
      : step === 2
        ? "Choose a structured weekly style for your goal, or let the coach adapt freely from your fitness and feedback."
        : "All fields are optional. The more you share, the better we can personalize your plan."

  async function handleFinish() {
    if (!goalType || !trainingStyle) return

    const targetTimeSeconds = parseDurationToSeconds(targetTime)
    if (targetTime.trim() && targetTimeSeconds == null) {
      setError("Use a time like 30:00 or 2:15:00")
      return
    }

    const current5kSeconds = parseDurationToSeconds(current5kTime)
    if (current5kTime.trim() && current5kSeconds == null) {
      setError("Use a 5K time like 28:00 or 0:28:00")
      return
    }

    const height = parseOptionalNumber(heightCm)
    if (heightCm.trim() && height == null) {
      setError("Enter a valid height in cm")
      return
    }

    const weight = parseOptionalNumber(weightKg)
    if (weightKg.trim() && weight == null) {
      setError("Enter a valid weight in kg")
      return
    }

    const longest = parseOptionalNumber(longestRunKm)
    if (longestRunKm.trim() && longest == null) {
      setError("Enter a valid longest run in km")
      return
    }

    setLoading(true)
    setError(null)

    const profile: Record<string, string | number> = {}
    if (height != null) profile.heightCm = height
    if (weight != null) profile.weightKg = weight
    if (birthDate.trim()) profile.birthDate = birthDate.trim()
    if (current5kSeconds != null) profile.current5kTime = current5kSeconds
    if (longest != null) profile.longestRunKm = longest

    const goal: {
      type: GoalType
      targetTimeSeconds?: number
      targetDate?: string
    } = { type: goalType }
    if (targetTimeSeconds != null) goal.targetTimeSeconds = targetTimeSeconds
    if (targetDate.trim()) goal.targetDate = targetDate.trim()

    try {
      const res = await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          trainingStyle,
          profile: Object.keys(profile).length > 0 ? profile : undefined,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        setError(data?.error ?? "Could not save onboarding")
        return
      }
      router.refresh()
    } catch {
      setError("Could not save onboarding")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root
      open={open}
      size="full"
      motionPreset="slide-in-bottom"
      closeOnInteractOutside={false}
      closeOnEscape={false}
      onOpenChange={() => {
        /* blocking: ignore close attempts */
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            display="flex"
            flexDirection="column"
            maxH="100dvh"
            borderRadius={0}
          >
            <Dialog.Header pb={2}>
              <VStack align="stretch" gap={1}>
                <Text fontSize="sm" color="fg.muted">
                  Step {step} of 3
                </Text>
                <Dialog.Title>{stepTitle}</Dialog.Title>
                <Dialog.Description>{stepDescription}</Dialog.Description>
              </VStack>
            </Dialog.Header>

            <Dialog.Body flex="1" overflowY="auto" py={4}>
              {step === 1 ? (
                <VStack align="stretch" gap={5}>
                  <SimpleGrid columns={2} gap={3}>
                    {GOAL_TYPES.map((type) => {
                      const selected = goalType === type
                      return (
                        <Button
                          key={type}
                          size="lg"
                          height="auto"
                          py={4}
                          variant={selected ? "solid" : "outline"}
                          colorPalette="orange"
                          onClick={() => setGoalType(type)}
                        >
                          {GOAL_LABELS[type]}
                        </Button>
                      )
                    })}
                  </SimpleGrid>

                  <Field.Root>
                    <Field.Label>Target time (optional)</Field.Label>
                    <Input
                      placeholder="e.g. 30:00 or 2:15:00"
                      value={targetTime}
                      onChange={(e) =>
                        setTargetTime(maskDurationRightAligned(e.target.value))
                      }
                      inputMode="numeric"
                      autoComplete="off"
                    />
                    <Field.HelperText>
                      Used to pace workouts and measure progress. Leave blank for a
                      typical amateur target.
                    </Field.HelperText>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Race date (optional)</Field.Label>
                    <Input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                    />
                    <Field.HelperText>
                      Sets your plan timeline. Leave blank and we’ll pick a sensible
                      race window for this distance.
                    </Field.HelperText>
                  </Field.Root>

                  {defaultPreview && (!targetTime.trim() || !targetDate.trim()) ? (
                    <Text fontSize="sm" color="fg.muted">
                      If you leave time or date blank, we’ll use ~
                      {defaultPreview.timeLabel} and a race about{" "}
                      {defaultPreview.months} months out for{" "}
                      {GOAL_LABELS[goalType!]}.
                    </Text>
                  ) : null}
                </VStack>
              ) : null}

              {step === 2 && preset ? (
                <VStack align="stretch" gap={3}>
                  <Button
                    size="lg"
                    height="auto"
                    py={4}
                    px={4}
                    variant={trainingStyle === "preset" ? "solid" : "outline"}
                    colorPalette="orange"
                    onClick={() => setTrainingStyle("preset")}
                    textAlign="left"
                    whiteSpace="normal"
                  >
                    <VStack align="stretch" gap={1} width="full">
                      <Text fontWeight="semibold">{preset.name}</Text>
                      <Text
                        fontSize="sm"
                        fontWeight="normal"
                        opacity={trainingStyle === "preset" ? 0.95 : 0.85}
                      >
                        {preset.summary}
                      </Text>
                    </VStack>
                  </Button>

                  <Button
                    size="lg"
                    height="auto"
                    py={4}
                    px={4}
                    variant={trainingStyle === "adaptive" ? "solid" : "outline"}
                    colorPalette="orange"
                    onClick={() => setTrainingStyle("adaptive")}
                    textAlign="left"
                    whiteSpace="normal"
                  >
                    <VStack align="stretch" gap={1} width="full">
                      <Text fontWeight="semibold">Adaptive to my needs</Text>
                      <Text
                        fontSize="sm"
                        fontWeight="normal"
                        opacity={trainingStyle === "adaptive" ? 0.95 : 0.85}
                      >
                        No fixed weekday template — the coach builds each week from
                        your fitness, history, and feedback.
                      </Text>
                    </VStack>
                  </Button>
                </VStack>
              ) : null}

              {step === 3 ? (
                <VStack align="stretch" gap={5}>
                  <Field.Root>
                    <Field.Label>Height (cm)</Field.Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="e.g. 178"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                    />
                    <Field.HelperText>
                      Helps estimate effort and personalize training load.
                    </Field.HelperText>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Weight (kg)</Field.Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="e.g. 67"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                    />
                    <Field.HelperText>
                      Helps estimate effort and personalize training load.
                    </Field.HelperText>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Birth date</Field.Label>
                    <Input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                    <Field.HelperText>
                      Age informs recovery and intensity recommendations.
                    </Field.HelperText>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Current 5K time</Field.Label>
                    <Input
                      placeholder="e.g. 28:00"
                      value={current5kTime}
                      onChange={(e) =>
                        setCurrent5kTime(maskMmSs(e.target.value))
                      }
                      inputMode="numeric"
                      autoComplete="off"
                    />
                    <Field.HelperText>
                      Baseline fitness so the first plan starts at the right level.
                    </Field.HelperText>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Longest run (km)</Field.Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="e.g. 12"
                      value={longestRunKm}
                      onChange={(e) => setLongestRunKm(e.target.value)}
                    />
                    <Field.HelperText>
                      Baseline fitness so the first plan starts at the right level.
                    </Field.HelperText>
                  </Field.Root>
                </VStack>
              ) : null}
            </Dialog.Body>

            <Dialog.Footer
              gap={3}
              flexDirection="column"
              alignItems="stretch"
              borderTopWidth="1px"
              pt={4}
            >
              {error ? (
                <Text textAlign="center" color="fg.error" fontSize="sm">
                  {error}
                </Text>
              ) : null}
              {step === 1 ? (
                <Button
                  colorPalette="orange"
                  size="lg"
                  width="full"
                  disabled={!goalType}
                  onClick={() => {
                    setError(null)
                    setStep(2)
                  }}
                >
                  Next
                </Button>
              ) : null}
              {step === 2 ? (
                <>
                  <Button
                    colorPalette="orange"
                    size="lg"
                    width="full"
                    disabled={!trainingStyle}
                    onClick={() => {
                      setError(null)
                      setStep(3)
                    }}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    width="full"
                    onClick={() => {
                      setError(null)
                      setStep(1)
                    }}
                  >
                    Back
                  </Button>
                </>
              ) : null}
              {step === 3 ? (
                <>
                  <Button
                    colorPalette="orange"
                    size="lg"
                    width="full"
                    loading={loading}
                    loadingText="Saving…"
                    onClick={handleFinish}
                  >
                    Finish
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    width="full"
                    disabled={loading}
                    onClick={() => {
                      setError(null)
                      setStep(2)
                    }}
                  >
                    Back
                  </Button>
                </>
              ) : null}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
