import { auth } from "@/auth"
import { SessionPlanDetails } from "@/components/SessionPlanDetails"
import { dbConnect } from "@/lib/db"
import { User } from "@/models"
import { getSessionPlanForUser } from "@/services/sessionPlans/getSessionPlanForUser"
import { Container, Text, VStack } from "@chakra-ui/react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function SessionPlanPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.stravaAthleteId) {
    redirect("/")
  }

  const { id } = await params

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

  return (
    <Container maxW="md" py={16}>
      <VStack gap={6} align="stretch">
        <Link href="/" style={{ textDecoration: "none", alignSelf: "flex-start" }}>
          <Text fontSize="sm" color="fg.muted">
            ← Back
          </Text>
        </Link>
        <SessionPlanDetails plan={plan} />
      </VStack>
    </Container>
  )
}
