import type { ProfileView } from "@/services/profile/types";
import { Text, VStack } from "@chakra-ui/react";

type Props = {
  profile: Pick<ProfileView, "name" | "email" | "memberSinceLabel">;
};

export function ProfileHeader({ profile }: Props) {
  return (
    <VStack gap={1} align="stretch">
      <Text fontSize="lg" fontWeight="semibold">
        {profile.name}
      </Text>
      <Text fontSize="sm" color="fg.muted">
        {profile.email}
      </Text>
      <Text fontSize="xs" color="fg.muted">
        Member since {profile.memberSinceLabel}
      </Text>
    </VStack>
  );
}
