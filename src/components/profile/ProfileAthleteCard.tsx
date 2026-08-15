import { ProfileField } from "@/components/profile/ProfileField";
import type { ProfileAthleteView } from "@/services/profile/types";
import { Card, VStack } from "@chakra-ui/react";

type Props = {
  athlete: ProfileAthleteView;
};

export function ProfileAthleteCard({ athlete }: Props) {
  if (athlete.fields.length === 0) return null;

  return (
    <Card.Root width="full">
      <Card.Header>
        <Card.Title>Athlete</Card.Title>
      </Card.Header>
      <Card.Body>
        <VStack gap={3} align="stretch">
          {athlete.fields.map((field) => (
            <ProfileField
              key={field.label}
              label={field.label}
              value={field.value}
            />
          ))}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
