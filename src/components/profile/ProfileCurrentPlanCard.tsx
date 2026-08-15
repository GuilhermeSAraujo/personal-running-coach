import { ProfileField } from "@/components/profile/ProfileField";
import type { ProfileCurrentPlanView } from "@/services/profile/types";
import { Card, VStack } from "@chakra-ui/react";

type Props = {
  plan: ProfileCurrentPlanView;
};

export function ProfileCurrentPlanCard({ plan }: Props) {
  return (
    <Card.Root width="full">
      <Card.Header>
        <Card.Title>Current plan</Card.Title>
      </Card.Header>
      <Card.Body>
        <VStack gap={3} align="stretch">
          <ProfileField label="Objective" value={plan.objective} />
          <ProfileField label="Status" value={plan.statusLabel} />
          <ProfileField label="Starts" value={plan.startDateLabel} />
          <ProfileField label="Ends" value={plan.endDateLabel} />
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
