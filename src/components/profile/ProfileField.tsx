import { Text, VStack } from "@chakra-ui/react";

export function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <VStack gap={0} align="stretch">
      <Text fontSize="xs" color="fg.muted" fontWeight="medium">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="semibold">
        {value}
      </Text>
    </VStack>
  );
}
