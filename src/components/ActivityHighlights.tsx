import {
  formatActivityDate,
  formatActivityType,
  formatDistanceKm,
  formatDuration,
  formatPace,
} from "@/lib/activityFormat";
import type { ActivityHighlights, ActivitySummary } from "@/services/activities/highlights";
import { Heading, Text, VStack } from "@chakra-ui/react";

type Props = {
  highlights: ActivityHighlights;
};

function secondaryLast(a: ActivitySummary): string {
  return `${formatActivityDate(a.startedAt)} · ${formatPace(a.paceSecondsPerKm)} · ${formatDuration(a.durationSeconds)}`;
}

function secondaryLongest(a: ActivitySummary): string {
  return `${formatActivityDate(a.startedAt)} · ${formatPace(a.paceSecondsPerKm)}`;
}

function secondaryFastest(a: ActivitySummary): string {
  return `${formatActivityDate(a.startedAt)} · ${formatDistanceKm(a.distanceKm)}`;
}

function HighlightRow({
  label,
  activity,
  primary,
  secondary,
}: {
  label: string;
  activity: ActivitySummary | null;
  primary: (a: ActivitySummary) => string;
  secondary: (a: ActivitySummary) => string;
}) {
  return (
    <VStack gap={0} align="stretch">
      <Text fontSize="xs" color="fg.muted" fontWeight="medium">
        {label}
      </Text>
      {activity ? (
        <>
          <Text fontSize="sm" fontWeight="semibold">
            {primary(activity)}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {secondary(activity)}
          </Text>
        </>
      ) : (
        <Text fontSize="sm" color="fg.muted">
          —
        </Text>
      )}
    </VStack>
  );
}

export function ActivityHighlights({ highlights }: Props) {
  const { last, longest, fastest } = highlights;
  const empty = last == null && longest == null && fastest == null;

  if (empty) {
    return (
      <VStack gap={1} align="stretch" width="full">
        <Heading size="xs" color="fg.muted">
          Recent activity
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          No activities yet. Sync from Strava to get started.
        </Text>
      </VStack>
    );
  }

  return (
    <VStack gap={2} align="stretch" width="full">
      <Heading size="xs" color="fg.muted">
        Recent activity
      </Heading>
      <HighlightRow
        label="Last activity"
        activity={last}
        primary={(a) =>
          `${formatDistanceKm(a.distanceKm)} · ${formatActivityType(a.type)}`
        }
        secondary={secondaryLast}
      />
      <HighlightRow
        label="Longest"
        activity={longest}
        primary={(a) =>
          `${formatDistanceKm(a.distanceKm)} · ${formatActivityType(a.type)}`
        }
        secondary={secondaryLongest}
      />
      <HighlightRow
        label="Fastest"
        activity={fastest}
        primary={(a) =>
          `${formatPace(a.paceSecondsPerKm)} · ${formatActivityType(a.type)}`
        }
        secondary={secondaryFastest}
      />
    </VStack>
  );
}
