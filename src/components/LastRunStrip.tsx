import {
  formatActivityDate,
  formatActivityType,
  formatDistanceKm,
  formatDuration,
  formatPace,
} from "@/lib/activityFormat";
import { DeleteLastActivityButton } from "@/components/DeleteLastActivityButton";
import type { ActivitySummary } from "@/services/activities/highlights";
import { HStack, Text, VStack } from "@chakra-ui/react";

type Props = {
  last: ActivitySummary | null;
};

export function LastRunStrip({ last }: Props) {
  return (
    <HStack justify="space-between" align="start" gap={2} width="full">
      <VStack gap={0} align="stretch" flex="1" minW={0}>
        <Text fontSize="xs" color="fg.muted" fontWeight="medium">
          Last run
        </Text>
        {last ? (
          <>
            <Text fontSize="sm" fontWeight="semibold">
              {formatDistanceKm(last.distanceKm)} · {formatActivityType(last.type)}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {formatActivityDate(last.startedAt)} · {formatPace(last.paceSecondsPerKm)}{" "}
              · {formatDuration(last.durationSeconds)}
            </Text>
          </>
        ) : (
          <Text fontSize="sm" color="fg.muted">
            No activities yet. Sync from Strava to get started.
          </Text>
        )}
      </VStack>
      {last ? <DeleteLastActivityButton /> : null}
    </HStack>
  );
}
