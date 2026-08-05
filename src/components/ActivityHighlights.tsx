import {
  formatActivityDate,
  formatActivityType,
  formatDistanceKm,
  formatDuration,
  formatPace,
} from "@/lib/activityFormat";
import type { ActivityHighlights, ActivitySummary } from "@/services/activities/highlights";
import { Text, VStack } from "@chakra-ui/react";

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
    <VStack gap={0.5} align="stretch">
      <Text fontSize="sm" color="fg.muted" fontWeight="medium">
        {label}
      </Text>
      {activity ? (
        <>
          <Text fontWeight="semibold">
            {primary(activity)}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {secondary(activity)}
          </Text>
        </>
      ) : (
        <Text color="fg.muted">—</Text>
      )}
    </VStack>
  );
}

export function ActivityHighlights({ highlights }: Props) {
  const { last, longest, fastest } = highlights;
  const empty = last == null && longest == null && fastest == null;

  if (empty) {
    return (
      <Text textAlign="center" color="fg.muted" fontSize="sm">
        No activities yet. Sync from Strava to get started.
      </Text>
    );
  }

  return (
    <VStack gap={4} align="stretch" width="full">
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
