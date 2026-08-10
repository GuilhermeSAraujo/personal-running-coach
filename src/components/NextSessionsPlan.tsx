import {
  formatDistanceRange,
  formatSessionType,
} from "@/lib/sessionPlanFormat";
import type { SessionPlanSummary } from "@/services/sessionPlans/types";
import { Button, Card, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";

type Props = {
  plan: SessionPlanSummary | null;
};

export function NextSessionsPlan({ plan }: Props) {
  if (!plan) {
    return (
      <Card.Root width="full">
        <Card.Header>
          <Card.Title>Next trainings</Card.Title>
        </Card.Header>
        <Card.Body>
          <Text color="fg.muted" fontSize="sm">
            No plan yet — sync activities to generate next week’s plan.
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Link href={`/session-plans/${plan.id}`} style={{ textDecoration: "none" }}>
      <Card.Root
        width="full"
        _hover={{ opacity: 0.85 }}
        transition="opacity 0.15s"
      >
        <Card.Header>
          <Card.Title>Next trainings</Card.Title>
        </Card.Header>
        <Card.Body>
          <VStack gap={3} align="stretch" width="full">
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
                    {session.scheduledDate} · {session.order}. {session.title}
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
        </Card.Body>
      </Card.Root>
    </Link>
  );
}

export function ProgressLink() {
  return (
    <Link href="/progress" style={{ textDecoration: "none", width: "100%" }}>
      <Button colorPalette="orange" size="lg" width="full">
        View progress
      </Button>
    </Link>
  );
}
