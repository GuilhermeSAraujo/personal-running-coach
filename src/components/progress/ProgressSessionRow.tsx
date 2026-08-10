import {
  formatDistanceKm,
  formatDuration,
  formatPace,
} from "@/lib/activityFormat";
import {
  formatDistanceRange,
  formatPaceMinPerKm,
  formatSessionType,
} from "@/lib/sessionPlanFormat";
import type {
  ProgressActivitySummary,
  ProgressMatchedTimelineItem,
  ProgressSession,
  ProgressUnplannedTimelineItem,
} from "@/services/progress/types";
import { Badge, Card, HStack, Text, VStack } from "@chakra-ui/react";
import type { ReactNode } from "react";

type StatusVisual = {
  colorPalette: "blue" | "green" | "orange" | "gray";
  label: string;
};

function openOrMatchedVisual(
  status: "open" | "matched",
  isRest: boolean,
): StatusVisual {
  if (isRest) return { colorPalette: "gray", label: "Rest" };
  if (status === "matched") return { colorPalette: "green", label: "Done" };
  return { colorPalette: "blue", label: "Upcoming" };
}

type PlannedActualProps = {
  totalDistanceKmMin?: number;
  totalDistanceKmMax?: number;
  paceMinPerKm?: number;
  paceMaxPerKm?: number;
  activity?: ProgressActivitySummary;
  activityUnavailable?: boolean;
  showPlanned: boolean;
};

function formatPlannedPace(
  paceMinPerKm?: number,
  paceMaxPerKm?: number,
): string | null {
  if (paceMinPerKm != null && paceMaxPerKm != null) {
    if (paceMinPerKm === paceMaxPerKm) {
      return formatPaceMinPerKm(paceMinPerKm);
    }
    return `${formatPaceMinPerKm(paceMinPerKm).replace(" /km", "")}–${formatPaceMinPerKm(paceMaxPerKm)}`;
  }
  if (paceMinPerKm != null) return formatPaceMinPerKm(paceMinPerKm);
  if (paceMaxPerKm != null) return formatPaceMinPerKm(paceMaxPerKm);
  return null;
}

function PlannedActualBlocks({
  totalDistanceKmMin,
  totalDistanceKmMax,
  paceMinPerKm,
  paceMaxPerKm,
  activity,
  activityUnavailable,
  showPlanned,
}: PlannedActualProps) {
  const plannedDistance = formatDistanceRange(
    totalDistanceKmMin,
    totalDistanceKmMax,
  );
  const plannedPace = formatPlannedPace(paceMinPerKm, paceMaxPerKm);
  const plannedParts = [plannedDistance, plannedPace].filter(Boolean);

  return (
    <VStack gap={1} align="stretch" pl={0}>
      {showPlanned && plannedParts.length > 0 ? (
        <Text fontSize="sm" color="fg.muted">
          Planned: {plannedParts.join(" · ")}
        </Text>
      ) : null}
      {activity ? (
        <Text fontSize="sm" color="fg.muted">
          Actual:{" "}
          {[
            formatDistanceKm(activity.distanceKm),
            formatDuration(activity.durationSeconds),
            formatPace(activity.paceSecondsPerKm),
          ].join(" · ")}
        </Text>
      ) : null}
      {activityUnavailable ? (
        <Text fontSize="sm" color="fg.muted">
          Activity unavailable
        </Text>
      ) : null}
    </VStack>
  );
}

function StatusCardShell({
  colorPalette,
  label,
  title,
  meta,
  children,
}: {
  colorPalette: StatusVisual["colorPalette"];
  label: string;
  title: string;
  meta: string;
  children?: ReactNode;
}) {
  return (
    <Card.Root
      width="full"
      colorPalette={colorPalette}
      borderLeftWidth="4px"
      borderLeftColor="colorPalette.solid"
    >
      <Card.Body>
        <VStack gap={2} align="stretch" width="full">
          <HStack justify="space-between" align="flex-start" gap={2}>
            <VStack gap={0.5} align="stretch" flex="1" minW={0}>
              <Text fontWeight="semibold">{title}</Text>
              <Text fontSize="sm" color="fg.muted">
                {meta}
              </Text>
            </VStack>
            <Badge colorPalette={colorPalette} size="sm" flexShrink={0}>
              {label}
            </Badge>
          </HStack>
          {children}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

type SessionRowProps = {
  session: ProgressSession;
};

export function ProgressSessionRow({ session }: SessionRowProps) {
  const isRest = session.type === "rest";
  const isDone = session.status === "matched";
  const visual = openOrMatchedVisual(session.status, isRest);
  const typeLabel = formatSessionType(session.type);

  return (
    <StatusCardShell
      colorPalette={visual.colorPalette}
      label={visual.label}
      title={`${session.scheduledDate} · ${session.title}`}
      meta={typeLabel}
    >
      {!isRest && !isDone && session.purpose ? (
        <Text fontSize="sm" color="fg.muted" lineClamp={1}>
          {session.purpose}
        </Text>
      ) : null}
      {!isRest ? (
        <PlannedActualBlocks
          totalDistanceKmMin={session.totalDistanceKmMin}
          totalDistanceKmMax={session.totalDistanceKmMax}
          paceMinPerKm={session.paceMinPerKm}
          paceMaxPerKm={session.paceMaxPerKm}
          activity={session.activity}
          activityUnavailable={session.activityUnavailable}
          showPlanned
        />
      ) : null}
    </StatusCardShell>
  );
}

type MatchedHistoryRowProps = {
  item: ProgressMatchedTimelineItem;
};

export function ProgressMatchedHistoryRow({ item }: MatchedHistoryRowProps) {
  const isRest = item.type === "rest";
  const visual = openOrMatchedVisual("matched", isRest);

  return (
    <StatusCardShell
      colorPalette={visual.colorPalette}
      label={visual.label}
      title={`${item.scheduledDate} · ${item.title}`}
      meta={formatSessionType(item.type)}
    >
      {!isRest ? (
        <PlannedActualBlocks
          totalDistanceKmMin={item.totalDistanceKmMin}
          totalDistanceKmMax={item.totalDistanceKmMax}
          paceMinPerKm={item.paceMinPerKm}
          paceMaxPerKm={item.paceMaxPerKm}
          activity={item.activity}
          activityUnavailable={item.activityUnavailable}
          showPlanned
        />
      ) : null}
    </StatusCardShell>
  );
}

type UnplannedHistoryRowProps = {
  item: ProgressUnplannedTimelineItem;
};

export function ProgressUnplannedHistoryRow({
  item,
}: UnplannedHistoryRowProps) {
  const { activity } = item;

  return (
    <StatusCardShell
      colorPalette="orange"
      label="Unplanned"
      title={item.date}
      meta="Unplanned run"
    >
      <Text fontSize="sm" color="fg.muted">
        {[
          formatDistanceKm(activity.distanceKm),
          formatDuration(activity.durationSeconds),
          formatPace(activity.paceSecondsPerKm),
        ].join(" · ")}
      </Text>
    </StatusCardShell>
  );
}
