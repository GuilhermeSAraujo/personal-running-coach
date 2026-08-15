import { auth, signIn, signOut } from "@/auth";
import { AppNav } from "@/components/AppNav";
import { ConsistencyChart } from "@/components/metrics/ConsistencyChart";
import { LongRunChart } from "@/components/metrics/LongRunChart";
import { MetricsEmptyState } from "@/components/metrics/MetricsEmptyState";
import { MetricsKpiStrip } from "@/components/metrics/MetricsKpiStrip";
import { PaceTrendChart } from "@/components/metrics/PaceTrendChart";
import { WeeklyVolumeChart } from "@/components/metrics/WeeklyVolumeChart";
import { formatActivityDate } from "@/lib/activityFormat";
import { dbConnect } from "@/lib/db";
import { User } from "@/models";
import { getMetricsDashboard } from "@/services/metrics/getMetricsDashboard";
import { Button, Container, Heading, Text, VStack } from "@chakra-ui/react";

async function signOutAction() {
  "use server";
  await signOut();
}

export default async function MetricsPage() {
  const session = await auth();

  if (!session) {
    return (
      <Container maxW="md" py={16}>
        <VStack gap={6} align="stretch">
          <Heading size="xl" textAlign="center">
            Welcome
          </Heading>
          <Text textAlign="center" color="fg.muted">
            Sign in with your Strava account to continue.
          </Text>
          <form
            action={async () => {
              "use server";
              await signIn("strava");
            }}
          >
            <Button type="submit" colorPalette="orange" size="lg" width="full">
              Connect with Strava
            </Button>
          </form>
        </VStack>
      </Container>
    );
  }

  let dashboard = null as Awaited<ReturnType<typeof getMetricsDashboard>> | null;
  let loadError: string | null = null;

  try {
    await dbConnect();
    const user = await User.findOne({
      "strava.athleteId": session.stravaAthleteId,
    })
      .select("_id")
      .lean();

    if (user) {
      dashboard = await getMetricsDashboard(user._id);
    } else {
      dashboard = { empty: true };
    }
  } catch {
    loadError = "Couldn’t load metrics right now. Try again after syncing.";
  }

  return (
    <Container maxW="md" py={16}>
      <VStack gap={6} align="stretch">
        <AppNav
          userName={session.user?.name}
          userImage={session.user?.image}
          signOutAction={signOutAction}
        />

        <VStack gap={1} align="stretch">
          <Heading size="md">Training metrics</Heading>
          <Text fontSize="sm" color="fg.muted">
            Last 12 completed weeks + this week (in progress)
          </Text>
          {dashboard && !dashboard.empty ? (
            <Text fontSize="xs" color="fg.muted">
              Updated {formatActivityDate(dashboard.generatedAt)}
            </Text>
          ) : null}
        </VStack>

        {loadError ? (
          <Text color="fg.muted" fontSize="sm">
            {loadError}
          </Text>
        ) : null}

        {!loadError && dashboard?.empty ? <MetricsEmptyState /> : null}

        {!loadError && dashboard && !dashboard.empty ? (
          <VStack gap={5} align="stretch">
            <MetricsKpiStrip kpis={dashboard.kpis} />
            <WeeklyVolumeChart weeks={dashboard.weeks} />
            <ConsistencyChart weeks={dashboard.weeks} />
            <LongRunChart
              weeks={dashboard.weeks}
              goalKm={dashboard.longRunGoalKm}
            />
            <PaceTrendChart weeks={dashboard.weeks} />
          </VStack>
        ) : null}
      </VStack>
    </Container>
  );
}
