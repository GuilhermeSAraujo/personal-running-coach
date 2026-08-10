import { ProgressSessionRow } from "@/components/progress/ProgressSessionRow";
import type { ProgressSession } from "@/services/progress/types";
import { Heading, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";

type Props = {
  planId: string | null;
  sessions: ProgressSession[];
};

export function ProgressThisWeek({ planId, sessions }: Props) {
  if (!planId || sessions.length === 0) {
    return (
      <VStack gap={2} align="stretch" width="full">
        <Heading size="sm">This week</Heading>
        <Text color="fg.muted" fontSize="sm">
          No open plan yet — sync activities from home to generate next week’s
          plan.
        </Text>
      </VStack>
    );
  }

  return (
    <VStack gap={3} align="stretch" width="full">
      <Heading size="sm">This week</Heading>
      {sessions.map((session) => (
        <ProgressSessionRow
          key={`${session.scheduledDate}-${session.order}`}
          session={session}
        />
      ))}
      <Link href={`/session-plans/${planId}`} style={{ textDecoration: "none" }}>
        <Text fontSize="xs" color="fg.muted" _hover={{ opacity: 0.85 }}>
          View plan details →
        </Text>
      </Link>
    </VStack>
  );
}
