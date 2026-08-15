"use client";

import { Card, Heading, HStack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { LuSparkles } from "react-icons/lu";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; message: string }
  | { status: "empty" }
  | { status: "error" };

export function DailyCoachMessage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/daily-coach-message", {
          signal: controller.signal,
        });
        if (!response.ok) {
          setState({ status: "error" });
          return;
        }
        const data: unknown = await response.json();
        const message =
          typeof data === "object" &&
          data != null &&
          "message" in data &&
          typeof (data as { message: unknown }).message === "string"
            ? (data as { message: string }).message
            : null;
        if (!message) {
          setState({ status: "empty" });
          return;
        }
        setState({ status: "ready", message });
      } catch {
        if (controller.signal.aborted) return;
        setState({ status: "error" });
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  if (state.status === "empty") {
    return null;
  }

  return (
    <Card.Root width="full" my={2}>
      <Card.Header pb={2}>
        <HStack gap={2} align="center">
          <LuSparkles aria-hidden size={18} />
          <Heading size="sm">Coach</Heading>
        </HStack>
      </Card.Header>
      <Card.Body pt={0} px={4} pb={4}>
        {state.status === "loading" ? (
          <Text fontSize="sm" color="fg.muted">
            Estamos gerando a análise mais recente...
          </Text>
        ) : null}
        {state.status === "ready" ? (
          <Text fontSize="sm">{state.message}</Text>
        ) : null}
        {state.status === "error" ? (
          <Text fontSize="sm" color="fg.muted">
            Não foi possível gerar a análise agora.
          </Text>
        ) : null}
      </Card.Body>
    </Card.Root>
  );
}
