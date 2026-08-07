import {
  formatDistanceRange,
  formatSegmentSummary,
  formatSessionType,
} from "@/lib/sessionPlanFormat";
import type { SessionPlanSummary } from "@/services/sessionPlans/types";
import { Heading, Text, VStack } from "@chakra-ui/react";

type Props = {
  plan: SessionPlanSummary;
};

export function SessionPlanDetails({ plan }: Props) {
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

      {plan.sessions.map((session) => {
        const distance = formatDistanceRange(
          session.totalDistanceKmMin,
          session.totalDistanceKmMax,
        );

        return (
          <VStack key={session.order} gap={2} align="stretch">
            <VStack gap={0.5} align="stretch">
              <Heading size="sm">
                {session.order}. {session.title}
              </Heading>
              <Text fontSize="sm" color="fg.muted">
                {[formatSessionType(session.type), distance]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </VStack>

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
        );
      })}
    </VStack>
  );
}
