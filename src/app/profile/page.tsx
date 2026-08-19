import { auth, signOut } from "@/auth";
import { AppNav } from "@/components/AppNav";
import { ProfileAthleteCard } from "@/components/profile/ProfileAthleteCard";
import { ProfileGoalCard } from "@/components/profile/ProfileGoalCard";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStartNeighborhoodsCard } from "@/components/profile/ProfileStartNeighborhoodsCard";
import { ProfileTrainingMethodCard } from "@/components/profile/ProfileTrainingMethodCard";
import { dbConnect } from "@/lib/db";
import { User } from "@/models";
import { getProfileView } from "@/services/profile/getProfileView";
import { listStartNeighborhoods } from "@/services/profile/startNeighborhoods";
import { Container, VStack } from "@chakra-ui/react";
import { redirect } from "next/navigation";

async function signOutAction() {
  "use server";
  await signOut();
}

export default async function ProfilePage() {
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

  const profile = await getProfileView(user._id);
  if (!profile) {
    redirect("/");
  }

  const neighborhoods = await listStartNeighborhoods(user._id);

  return (
    <Container maxW="md" py={16}>
      <VStack gap={6} align="stretch">
        <AppNav
          userName={session.user?.name}
          userImage={session.user?.image}
          signOutAction={signOutAction}
        />
        <ProfileHeader profile={profile} />
        <ProfileGoalCard goal={profile.goal} />
        <ProfileTrainingMethodCard trainingMethod={profile.trainingMethod} />
        <ProfileAthleteCard athlete={profile.athlete} />
        <ProfileStartNeighborhoodsCard neighborhoods={neighborhoods} />
      </VStack>
    </Container>
  );
}
