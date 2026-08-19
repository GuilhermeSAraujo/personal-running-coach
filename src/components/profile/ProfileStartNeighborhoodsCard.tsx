import type { StartNeighborhoodCount } from "@/services/profile/startNeighborhoods";
import { Box, Card, HStack, Text, VStack } from "@chakra-ui/react";

type Props = {
  neighborhoods: StartNeighborhoodCount[];
};

export function ProfileStartNeighborhoodsCard({ neighborhoods }: Props) {
  return (
    <Card.Root width="full">
      <Card.Header>
        <Card.Title>Start neighborhoods</Card.Title>
      </Card.Header>
      <Card.Body>
        {neighborhoods.length === 0 ? (
          <Text color="fg.muted" fontSize="sm">
            No start neighborhoods yet.
          </Text>
        ) : (
          <Box maxH="240px" overflowY="auto">
            <VStack gap={2} align="stretch">
              {neighborhoods.map((item) => (
                <HStack key={item.name} justify="space-between" gap={3}>
                  <Text fontSize="sm">&quot;{item.name}&quot;</Text>
                  <Text fontSize="sm" fontWeight="semibold">
                    {item.count}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  );
}
