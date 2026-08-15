import { ProfileField } from "@/components/profile/ProfileField";
import type { ProfileTrainingMethodView } from "@/services/profile/types";
import { Card, HStack, Text, VStack } from "@chakra-ui/react";

type Props = {
  trainingMethod: ProfileTrainingMethodView;
};

export function ProfileTrainingMethodCard({ trainingMethod }: Props) {
  const { styleLabel, preset } = trainingMethod;

  return (
    <Card.Root width="full">
      <Card.Header>
        <Card.Title>Training method</Card.Title>
      </Card.Header>
      <Card.Body>
        <VStack gap={4} align="stretch">
          <ProfileField label="Style" value={styleLabel} />

          {preset ? (
            <>
              <VStack gap={1} align="stretch">
                <Text fontSize="sm" fontWeight="semibold">
                  {preset.name}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  {preset.summary}
                </Text>
              </VStack>
              <Text fontSize="sm">{preset.philosophy}</Text>
              <VStack gap={1} align="stretch">
                <Text fontSize="xs" color="fg.muted" fontWeight="medium">
                  Typical week
                </Text>
                {preset.weekTemplate.map((day) => (
                  <HStack key={day.weekday} justify="space-between" gap={3}>
                    <Text fontSize="sm">{day.weekdayLabel}</Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {day.roleLabel}
                    </Text>
                  </HStack>
                ))}
              </VStack>
              <VStack gap={1} align="stretch">
                <Text fontSize="xs" color="fg.muted" fontWeight="medium">
                  Rules
                </Text>
                {preset.rules.map((rule) => (
                  <Text key={rule} fontSize="sm">
                    {rule}
                  </Text>
                ))}
              </VStack>
            </>
          ) : trainingMethod.style === "adaptive" ? (
            <Text fontSize="sm" color="fg.muted">
              No fixed weekday template — the coach builds each week from your
              fitness, history, and feedback.
            </Text>
          ) : null}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
