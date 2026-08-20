import {
  ProgressMatchedHistoryRow,
  ProgressUnplannedHistoryRow,
} from "@/components/progress/ProgressSessionRow";
import type { ProgressTimelineItem } from "@/services/progress/types";
import { Heading, Text, VStack } from "@chakra-ui/react";

type Props = {
  items: ProgressTimelineItem[];
  showHeading?: boolean;
};

export function ProgressHistory({ items, showHeading = true }: Props) {
  if (items.length === 0) {
    return (
      <VStack gap={2} align="stretch" width="full">
        {showHeading ? <Heading size="sm">Recent history</Heading> : null}
        <Text color="fg.muted" fontSize="sm">
          No matched sessions or unplanned runs in the last four weeks.
        </Text>
      </VStack>
    );
  }

  return (
    <VStack gap={3} align="stretch" width="full">
      {showHeading ? <Heading size="sm">Recent history</Heading> : null}
      <Text fontSize="xs" color="fg.muted">
        Last ~4 weeks
      </Text>
      {items.map((item, index) => {
        if (item.kind === "unplanned") {
          return (
            <ProgressUnplannedHistoryRow
              key={`unplanned-${item.activity.id}`}
              item={item}
            />
          );
        }
        return (
          <ProgressMatchedHistoryRow
            key={`matched-${item.scheduledDate}-${item.title}-${index}`}
            item={item}
          />
        );
      })}
    </VStack>
  );
}
