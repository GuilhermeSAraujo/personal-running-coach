import { ProfileField } from "@/components/profile/ProfileField";
import type { ProfileGoalView } from "@/services/profile/types";
import { Card, Text, VStack } from "@chakra-ui/react";

type Props = {
  goal: ProfileGoalView | null;
};

export function ProfileGoalCard({ goal }: Props) {
  return (
    <Card.Root width="full">
      <Card.Header>
        <Card.Title>Goal</Card.Title>
      </Card.Header>
      <Card.Body>
        {goal ? (
          <VStack gap={3} align="stretch">
            <ProfileField label="Race" value={goal.typeLabel} />
            <ProfileField label="Distance" value={goal.distanceLabel} />
            <ProfileField label="Target time" value={goal.targetTimeLabel} />
            <ProfileField label="Race date" value={goal.targetDateLabel} />
          </VStack>
        ) : (
          <Text color="fg.muted" fontSize="sm">
            No race goal yet.
          </Text>
        )}
      </Card.Body>
    </Card.Root>
  );
}
