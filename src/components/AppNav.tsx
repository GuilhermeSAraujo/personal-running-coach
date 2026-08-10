"use client"

import { SyncActivitiesButton } from "@/components/SyncActivitiesButton"
import { Button, Text } from "@chakra-ui/react"
import Link from "next/link"

type AppNavProps = {
  userName?: string | null
  signOutAction: () => Promise<void>
}

export function AppNav({ userName, signOutAction }: AppNavProps) {
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
        <form action={signOutAction}>
          <Button type="submit" size="sm" variant="outline" colorPalette="red">
            Sign Out
          </Button>
        </form>
      }
    />
  )
}
