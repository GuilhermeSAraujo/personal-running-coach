"use client";

import { Collapsible, HStack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { LuChevronDown } from "react-icons/lu";

type Props = {
  children: ReactNode;
};

export function RecentHistoryDisclosure({ children }: Props) {
  return (
    <Collapsible.Root width="full">
      <Collapsible.Trigger width="full" textAlign="start" cursor="pointer" py={1}>
        <HStack justify="space-between" width="full">
          <Text fontWeight="semibold" fontSize="sm">
            Recent history
          </Text>
          <Collapsible.Indicator
            display="inline-flex"
            transition="transform 0.15s"
            _open={{ transform: "rotate(180deg)" }}
          >
            <LuChevronDown />
          </Collapsible.Indicator>
        </HStack>
      </Collapsible.Trigger>
      <Collapsible.Content pt={3}>{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}

