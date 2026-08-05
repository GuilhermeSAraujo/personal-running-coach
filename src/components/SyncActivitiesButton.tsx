"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Text, VStack } from "@chakra-ui/react"

export function SyncActivitiesButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSync() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/activities/sync", { method: "POST" })
      if (!res.ok) {
        setError("Sync failed")
        return
      }
      router.refresh()
    } catch {
      setError("Sync failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <VStack gap={2} align="stretch" width="full">
      <Button
        colorPalette="orange"
        size="lg"
        width="full"
        loading={loading}
        loadingText="Syncing…"
        onClick={handleSync}
      >
        Sync activities
      </Button>
      {error ? (
        <Text textAlign="center" color="fg.error" fontSize="sm">
          {error}
        </Text>
      ) : null}
    </VStack>
  )
}
