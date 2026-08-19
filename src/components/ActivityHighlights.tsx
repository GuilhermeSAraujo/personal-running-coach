import {
  formatActivityDate,
  formatActivityType,
  formatDistanceKm,
  formatDuration,
  formatPace,
} from "@/lib/activityFormat";
import { DeleteLastActivityButton } from "@/components/DeleteLastActivityButton";
import type { ActivityHighlights, ActivitySummary } from "@/services/activities/highlights";
import { Card, HStack, Text, VStack } from "@chakra-ui/react";
import type { ReactNode } from "react";

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
  action,
}: {
  label: string;
  activity: ActivitySummary | null;
  primary: (a: ActivitySummary) => string;
  secondary: (a: ActivitySummary) => string;
  action?: ReactNode;
}) {
  return (
    <HStack justify="space-between" align="start" gap={2}>
      <VStack gap={0} align="stretch" flex="1">
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
      {action}
    </HStack>
  );
}

export function ActivityHighlights({ highlights }: Props) {
  const { last, longest, fastest } = highlights;
  const empty = last == null && longest == null && fastest == null;

  if (empty) {
    return (
      <Card.Root width="full">
        <Card.Header>
          <Card.Title>Recent activity</Card.Title>
        </Card.Header>
        <Card.Body>
          <Text color="fg.muted" fontSize="sm">
            No activities yet. Sync from Strava to get started.
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Card.Root width="full">
      <Card.Header>
        <Card.Title>Recent activity</Card.Title>
      </Card.Header>
      <Card.Body>
        <VStack gap={2} align="stretch" width="full">
          <HighlightRow
            label="Last activity"
            activity={last}
            primary={(a) =>
              `${formatDistanceKm(a.distanceKm)} · ${formatActivityType(a.type)}`
            }
            secondary={secondaryLast}
            action={last ? <DeleteLastActivityButton /> : null}
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
      </Card.Body>
    </Card.Root>
  );
}
