import { auth, signOut } from "@/auth";
import { AppNav } from "@/components/AppNav";
import { ProgressHistory } from "@/components/progress/ProgressHistory";
import { ProgressThisWeek } from "@/components/progress/ProgressThisWeek";
import { dbConnect } from "@/lib/db";
import { User } from "@/models";
import { getProgressFollowUp } from "@/services/progress/getProgressFollowUp";
import { Container, Heading, Text, VStack } from "@chakra-ui/react";
import { redirect } from "next/navigation";

async function signOutAction() {
  "use server";
  await signOut();
}

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.stravaAthleteId) {
    redirect("/");
  }

  await dbConnect();
  const user = await User.findOne({
    "strava.athleteId": session.stravaAthleteId,
  })
    .select("_id")
    .lean();

  if (!user) {
    redirect("/");
  }

  const progress = await getProgressFollowUp(user._id);

  return (
    <Container maxW="md" py={16}>
      <VStack gap={8} align="stretch">
        <AppNav userName={session.user?.name} signOutAction={signOutAction} />

        <VStack gap={2} align="stretch">
          <Heading size="md">Progress</Heading>
          <Text fontSize="sm" color="fg.muted">
            What you’ve done and what’s still ahead.
          </Text>
        </VStack>

        <ProgressThisWeek
          planId={progress.thisWeek?.planId ?? null}
          sessions={progress.thisWeek?.sessions ?? []}
        />

        <ProgressHistory items={progress.history} />
      </VStack>
    </Container>
  );
}
