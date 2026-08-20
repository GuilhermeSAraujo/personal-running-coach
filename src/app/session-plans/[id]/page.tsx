import { auth } from "@/auth"
import { BackLink } from "@/components/BackLink"
import { SessionPlanDetails } from "@/components/SessionPlanDetails"
import { dbConnect } from "@/lib/db"
import { resolveOpenSessionDate } from "@/lib/sessionPlanNav"
import { User } from "@/models"
import { getSessionPlanForUser } from "@/services/sessionPlans/getSessionPlanForUser"
import { Container, VStack } from "@chakra-ui/react"
import { notFound, redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ date?: string | string[] }>
}

function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function SessionPlanPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth()
  if (!session?.stravaAthleteId) {
    redirect("/")
  }

  const { id } = await params
  const { date } = await searchParams

  await dbConnect()
  const user = await User.findOne({
    "strava.athleteId": session.stravaAthleteId,
  })
    .select("_id")
    .lean()

  if (!user) {
    redirect("/")
  }

  const plan = await getSessionPlanForUser(id, user._id)
  if (!plan) {
    notFound()
  }

  const openDate = resolveOpenSessionDate(
    plan.sessions,
    firstSearchParam(date),
  )

  return (
    <Container maxW="md" py={16}>
      <VStack gap={6} align="stretch">
        <BackLink />
        <SessionPlanDetails plan={plan} openDate={openDate} />
      </VStack>
    </Container>
  )
}
