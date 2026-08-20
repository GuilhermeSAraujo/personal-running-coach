"use client";

import {
  formatDistanceRange,
  formatSegmentSummary,
  formatSessionType,
} from "@/lib/sessionPlanFormat";
import type {
  PlannedSessionSummary,
  SessionPlanSummary,
} from "@/services/sessionPlans/types";
import { Card, Collapsible, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { useEffect } from "react";
import { LuChevronDown } from "react-icons/lu";

type Props = {
  plan: SessionPlanSummary;
  openDate?: string | null;
};

function formatWeekday(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

function sessionElementId(date: string): string {
  return `session-${date}`;
}

function PlannedSessionCard({
  session,
  defaultOpen,
}: {
  session: PlannedSessionSummary;
  defaultOpen: boolean;
}) {
  const distance = formatDistanceRange(
    session.totalDistanceKmMin,
    session.totalDistanceKmMax,
  );
  const meta = [formatSessionType(session.type), distance]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card.Root
      id={sessionElementId(session.scheduledDate)}
      width="full"
      scrollMarginTop="6"
    >
      <Card.Body>
        <Collapsible.Root defaultOpen={defaultOpen} width="full">
          <Collapsible.Trigger
            width="full"
            textAlign="start"
            cursor="pointer"
            py={1}
          >
            <HStack justify="space-between" align="flex-start" gap={2} width="full">
              <VStack gap={0.5} align="stretch" flex="1" minW={0}>
                <Text fontWeight="semibold">
                  {formatWeekday(session.scheduledDate)} · {session.title}
                </Text>
                {meta ? (
                  <Text fontSize="sm" color="fg.muted">
                    {meta}
                  </Text>
                ) : null}
              </VStack>
              <Collapsible.Indicator
                display="inline-flex"
                transition="transform 0.15s"
                _open={{ transform: "rotate(180deg)" }}
              >
                <LuChevronDown />
              </Collapsible.Indicator>
            </HStack>
          </Collapsible.Trigger>
          <Collapsible.Content pt={3}>
            <VStack gap={2} align="stretch">
              <Text>{session.purpose}</Text>

              {session.coachingNotes.length > 0 ? (
                <VStack gap={1} align="stretch">
                  <Text fontSize="sm" color="fg.muted" fontWeight="medium">
                    Coaching notes
                  </Text>
                  {session.coachingNotes.map((note, index) => (
                    <Text key={index} fontSize="sm">
                      • {note}
                    </Text>
                  ))}
                </VStack>
              ) : null}

              {session.segments.length > 0 ? (
                <VStack gap={1} align="stretch">
                  <Text fontSize="sm" color="fg.muted" fontWeight="medium">
                    Segments
                  </Text>
                  {session.segments.map((segment, index) => (
                    <VStack key={index} gap={0} align="stretch">
                      <Text fontSize="sm">{formatSegmentSummary(segment)}</Text>
                      {segment.notes ? (
                        <Text fontSize="xs" color="fg.muted">
                          {segment.notes}
                        </Text>
                      ) : null}
                    </VStack>
                  ))}
                </VStack>
              ) : null}
            </VStack>
          </Collapsible.Content>
        </Collapsible.Root>
      </Card.Body>
    </Card.Root>
  );
}

export function SessionPlanDetails({ plan, openDate = null }: Props) {
  useEffect(() => {
    if (!openDate) return;
    document.getElementById(sessionElementId(openDate))?.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
  }, [openDate]);

  return (
    <VStack gap={6} align="stretch" width="full">
      <Heading size="md">Training plan</Heading>

      {plan.rationale ? (
        <VStack gap={1} align="stretch">
          <Text fontSize="sm" color="fg.muted" fontWeight="medium">
            Why this plan
          </Text>
          <Text>{plan.rationale}</Text>
        </VStack>
      ) : null}

      {plan.sessions.map((session) => (
        <PlannedSessionCard
          key={session.order}
          session={session}
          defaultOpen={session.scheduledDate === openDate}
        />
      ))}
    </VStack>
  );
}
