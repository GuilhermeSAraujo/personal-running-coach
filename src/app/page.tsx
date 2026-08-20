import { auth, signIn, signOut } from "@/auth"
import Link from "next/link"
import { AppNav } from "@/components/AppNav"
import { DailyCoachMessage } from "@/components/DailyCoachMessage"
import { LastRunStrip } from "@/components/LastRunStrip"
import { OnboardingModal } from "@/components/OnboardingModal"
import { ProgressHistory } from "@/components/progress/ProgressHistory"
import { RecentHistoryDisclosure } from "@/components/progress/RecentHistoryDisclosure"
import { WeekRail } from "@/components/weekRail/WeekRail"
import { dbConnect } from "@/lib/db"
import { buildHomeHistory } from "@/lib/weekBoard"
import { User } from "@/models"
import { utcDateString } from "@/services/ai/planWindow"
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

  const thisWeekSessions = progress?.thisWeek?.sessions ?? []
  const homeHistory = buildHomeHistory(
    thisWeekSessions,
    progress?.history ?? [],
    utcDateString(new Date()),
  )

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

            {!needsOnboarding ? (
              <DailyCoachMessage key={highlights?.last?.id ?? "no-activity"} />
            ) : null}

            <WeekRail
              planId={progress?.thisWeek?.planId ?? null}
              sessions={thisWeekSessions}
            />

            {highlights ? <LastRunStrip last={highlights.last} /> : null}

            <Button asChild width="full" size="sm" colorPalette="orange">
              <Link href="/metrics">Training metrics →</Link>
            </Button>

            <RecentHistoryDisclosure>
              <ProgressHistory items={homeHistory} showHeading={false} />
            </RecentHistoryDisclosure>

            <OnboardingModal open={needsOnboarding} />
          </VStack>
        )}
      </VStack>
    </Container>
  )
}
