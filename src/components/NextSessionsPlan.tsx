import {
  formatDistanceRange,
  formatSessionType,
} from "@/lib/sessionPlanFormat";
import type { SessionPlanSummary } from "@/services/sessionPlans/types";
import { Heading, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";

type Props = {
  plan: SessionPlanSummary | null;
};

export function NextSessionsPlan({ plan }: Props) {
  if (!plan) {
    return (
      <VStack gap={2} align="stretch" width="full">
        <Heading size="sm">Next trainings</Heading>
        <Text color="fg.muted" fontSize="sm">
          No plan yet — sync activities to generate your next sessions.
        </Text>
      </VStack>
    );
  }

  return (
    <Link href={`/session-plans/${plan.id}`} style={{ textDecoration: "none" }}>
      <VStack
        gap={3}
        align="stretch"
        width="full"
        _hover={{ opacity: 0.85 }}
        transition="opacity 0.15s"
      >
        <Heading size="sm">Next trainings</Heading>
        {plan.sessions.map((session) => {
          const distance = formatDistanceRange(
            session.totalDistanceKmMin,
            session.totalDistanceKmMax,
          );
          const meta = [formatSessionType(session.type), distance]
            .filter(Boolean)
            .join(" · ");

          return (
            <VStack key={session.order} gap={0.5} align="stretch">
              <Text fontWeight="semibold">
                {session.order}. {session.title}
                {meta ? (
                  <Text as="span" fontWeight="normal" color="fg.muted">
                    {" "}
                    · {meta}
                  </Text>
                ) : null}
              </Text>
              <Text fontSize="sm" color="fg.muted" lineClamp={1}>
                {session.purpose}
              </Text>
            </VStack>
          );
        })}
        <Text fontSize="xs" color="fg.muted">
          View plan details →
        </Text>
      </VStack>
    </Link>
  );
}
