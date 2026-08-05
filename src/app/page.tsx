import { auth, signIn, signOut } from "@/auth"
import { ActivityHighlights } from "@/components/ActivityHighlights"
import { OnboardingModal } from "@/components/OnboardingModal"
import { SyncActivitiesButton } from "@/components/SyncActivitiesButton"
import { dbConnect } from "@/lib/db"
import { User } from "@/models"
import {
  getActivityHighlights,
  type ActivityHighlights as ActivityHighlightsData,
} from "@/services/activities/highlights"
import { Button, Container, Heading, Text, VStack } from "@chakra-ui/react"

export default async function HomePage() {
  const session = await auth()

  let needsOnboarding = false
  let highlights: ActivityHighlightsData | null = null

  if (session?.stravaAthleteId) {
    await dbConnect()
    const user = await User.findOne({
      "strava.athleteId": session.stravaAthleteId,
    })
      .select("_id goal.type")
      .lean()
    needsOnboarding = !user?.goal?.type
    if (user) {
      highlights = await getActivityHighlights(user._id)
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
          <VStack gap={4}>
            <Heading size="md" textAlign="center">
              Logged in as {session.user?.name}
            </Heading>
            {highlights ? <ActivityHighlights highlights={highlights} /> : null}
            <SyncActivitiesButton />
            <form
              action={async () => {
                "use server"
                await signOut()
              }}
            >
              <Button type="submit" variant="outline" colorPalette="red" width="full">
                Sign Out
              </Button>
            </form>
            <OnboardingModal open={needsOnboarding} />
          </VStack>
        )}
      </VStack>
    </Container>
  )
}
