"use client"

import { SyncActivitiesButton } from "@/components/SyncActivitiesButton"
import { Avatar, Button, HStack, Text } from "@chakra-ui/react"
import Link from "next/link"

type AppNavProps = {
  userName?: string | null
  userImage?: string | null
  signOutAction: () => Promise<void>
}

export function AppNav({ userName, userImage, signOutAction }: AppNavProps) {
  const label = userName?.trim() || "Home"

  return (
    <SyncActivitiesButton
      compact
      leading={
        <Link href="/" style={{ textDecoration: "none" }}>
          <Text fontWeight="semibold" fontSize="sm" lineClamp={1}>
            {label}
          </Text>
        </Link>
      }
      trailing={
        <HStack gap={2} align="center" flexShrink={0}>
          <Link href="/profile" aria-label="Profile">
            <Avatar.Root size="sm">
              <Avatar.Fallback name={userName?.trim() || undefined} />
              {userImage ? <Avatar.Image src={userImage} alt="" /> : null}
            </Avatar.Root>
          </Link>
          <form action={signOutAction}>
            <Button type="submit" size="sm" variant="outline" colorPalette="red">
              Sign Out
            </Button>
          </form>
        </HStack>
      }
    />
  )
}
