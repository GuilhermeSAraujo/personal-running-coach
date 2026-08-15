import { auth, signIn, signOut } from "@/auth"
import Link from "next/link"
import { ActivityHighlights } from "@/components/ActivityHighlights"
import { AppNav } from "@/components/AppNav"
import { DailyCoachMessage } from "@/components/DailyCoachMessage"
import { OnboardingModal } from "@/components/OnboardingModal"
import { ProgressHistory } from "@/components/progress/ProgressHistory"
import { ProgressThisWeek } from "@/components/progress/ProgressThisWeek"
import { dbConnect } from "@/lib/db"
import { User } from "@/models"
import {
  getActivityHighlights,
  type ActivityHighlights as ActivityHighlightsData,
} from "@/services/activities/highlights"
import { getProgressFollowUp } from "@/services/progress/getProgressFollowUp"
import type { ProgressFollowUp } from "@/services/progress/types"
import { Button, Container, Heading, Text, VStack } from "@chakra-ui/react"

async function signOutAction() {
  "use server"
  await signOut()
}

export default async function HomePage() {
  const session = await auth()

  let needsOnboarding = false
  let highlights: ActivityHighlightsData | null = null
  let progress: ProgressFollowUp | null = null

  if (session?.stravaAthleteId) {
    await dbConnect()
    const user = await User.findOne({
      "strava.athleteId": session.stravaAthleteId,
    })
      .select("_id goal.type")
      .lean()
    needsOnboarding = !user?.goal?.type
    if (user) {
      ;[highlights, progress] = await Promise.all([
        getActivityHighlights(user._id),
        getProgressFollowUp(user._id),
      ])
    }
  }

  return (
    <Container maxW="md" py={16}>
      <VStack gap={6} align="stretch">
        {!session ? (
          <>
            <Heading size="xl" textAlign="center">
              Welcome
            </Heading>
            <Text textAlign="center" color="fg.muted">
              Sign in with your Strava account to continue.
            </Text>
            <form
              action={async () => {
                "use server"
                await signIn("strava")
              }}
            >
              <Button type="submit" colorPalette="orange" size="lg" width="full">
                Connect with Strava
              </Button>
            </form>
          </>
        ) : (
          <VStack gap={8} align="stretch">
            <AppNav
              userName={session.user?.name}
              userImage={session.user?.image}
              signOutAction={signOutAction}
            />

            {!needsOnboarding ? <DailyCoachMessage /> : null}

            <VStack gap={2} align="stretch">
              <Heading size="md">Progress</Heading>
              <Text fontSize="sm" color="fg.muted">
                What you’ve done and what’s still ahead.
              </Text>
            </VStack>

            <Link href="/metrics" style={{ textDecoration: "none", width: "100%" }}>
              <Button colorPalette="orange" variant="outline" size="lg" width="full">
                Training metrics
              </Button>
            </Link>

            <ProgressThisWeek
              planId={progress?.thisWeek?.planId ?? null}
              sessions={progress?.thisWeek?.sessions ?? []}
            />

            <ProgressHistory items={progress?.history ?? []} />

            {highlights ? <ActivityHighlights highlights={highlights} /> : null}
            <OnboardingModal open={needsOnboarding} />
          </VStack>
        )}
      </VStack>
    </Container>
  )
}
