"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Text, VStack } from "@chakra-ui/react";

export function DeleteLastActivityButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this activity and reset coaching to before it was imported?",
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/activities/last", { method: "DELETE" });
      if (!response.ok) {
        setError("Could not delete the last activity.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not delete the last activity.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <VStack gap={1} align="end">
      <Button
        size="xs"
        variant="outline"
        colorPalette="red"
        loading={loading}
        disabled={loading}
        onClick={() => void handleDelete()}
      >
        Delete
      </Button>
      {error ? (
        <Text fontSize="xs" color="fg.error">
          {error}
        </Text>
      ) : null}
    </VStack>
  );
}
