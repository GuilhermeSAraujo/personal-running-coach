import { Text, VStack } from "@chakra-ui/react";

export function MetricsEmptyState() {
  return (
    <VStack gap={2} align="stretch">
      <Text color="fg.muted" fontSize="sm">
        No training snapshot yet. Sync your Strava activities from the top bar
        to generate metrics.
      </Text>
    </VStack>
  );
}
