"use client";

import { formatSessionTypeShort } from "@/lib/sessionPlanFormat";
import {
  buildWeekBoard,
  selectWeekDay,
  type WeekDay,
  type WeekDayStatus,
} from "@/lib/weekBoard";
import { ProgressSessionRow } from "@/components/progress/ProgressSessionRow";
import type { ProgressSession } from "@/services/progress/types";
import { Box, Grid, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";
import { useMemo, useState } from "react";

type WeekRailProps = {
  planId: string | null;
  sessions: ProgressSession[];
};

function weekdayLabel(day: WeekDay): string {
  if (day.isToday) return "Today";
  return new Date(`${day.date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function dayNumber(date: string): string {
  return String(new Date(`${date}T00:00:00.000Z`).getUTCDate());
}

function statusPalette(
  status: WeekDayStatus,
): "blue" | "green" | "gray" | undefined {
  if (status === "open") return "blue";
  if (status === "matched") return "green";
  if (status === "rest") return "gray";
  return undefined;
}

function typeLabel(day: WeekDay): string {
  if (!day.session) return "—";
  return formatSessionTypeShort(day.session.type);
}

function cellAriaLabel(day: WeekDay): string {
  const when = day.isToday
    ? "Today"
    : `${weekdayLabel(day)} ${dayNumber(day.date)}`;
  return `${when}, ${typeLabel(day)}`;
}

function WeekDayCell({
  day,
  selected,
  onSelect,
}: {
  day: WeekDay;
  selected: boolean;
  onSelect: (date: string) => void;
}) {
  const palette = statusPalette(day.status);
  const muted = day.status === "empty";

  return (
    <Box
      as="button"
      aria-pressed={selected}
      aria-current={day.isToday ? "date" : undefined}
      aria-label={cellAriaLabel(day)}
      onClick={() => onSelect(day.date)}
      colorPalette={palette}
      minW={0}
      px={0.5}
      pt={1}
      pb={2}
      textAlign="center"
      cursor="pointer"
      borderBottomWidth="3px"
      borderBottomColor={
        selected ? "colorPalette.solid" : day.isToday ? "colorPalette.muted" : "border"
      }
      bg={selected ? "colorPalette.subtle" : undefined}
      borderTopRadius="md"
      _hover={{ bg: selected ? "colorPalette.subtle" : "bg.muted" }}
      _focusVisible={{ outline: "2px solid", outlineColor: "colorPalette.solid" }}
    >
      <VStack gap={0.5} align="center">
        <Text
          fontSize="2xs"
          fontWeight={day.isToday || selected ? "bold" : "medium"}
          textTransform="uppercase"
          letterSpacing="0.08em"
          color={day.isToday || selected ? "colorPalette.fg" : "fg.muted"}
          lineClamp={1}
        >
          {weekdayLabel(day)}
        </Text>
        <Text
          fontSize={day.isToday ? "xl" : "md"}
          fontWeight={day.isToday ? "bold" : selected ? "bold" : "semibold"}
          lineHeight="1"
          fontVariantNumeric="tabular-nums"
          color={muted ? "fg.muted" : undefined}
        >
          {dayNumber(day.date)}
        </Text>
        <Text
          fontSize="2xs"
          color={muted ? "fg.muted" : "colorPalette.fg"}
          lineClamp={1}
        >
          {typeLabel(day)}
        </Text>
      </VStack>
    </Box>
  );
}

function DaySessionPanel({
  day,
  hasPlan,
}: {
  day: WeekDay;
  hasPlan: boolean;
}) {
  if (day.session) {
    return <ProgressSessionRow session={day.session} />;
  }

  if (!hasPlan) {
    return (
      <Text color="fg.muted" fontSize="sm">
        No open plan yet — sync activities from home to generate next week’s
        plan.
      </Text>
    );
  }

  return (
    <Text color="fg.muted" fontSize="sm">
      {day.isToday
        ? "No session planned for today."
        : "No session planned for this day."}
    </Text>
  );
}

export function WeekRail({ planId, sessions }: WeekRailProps) {
  const days = useMemo(() => buildWeekBoard(sessions), [sessions]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selected = selectWeekDay(days, selectedDate);
  const hasPlan = Boolean(planId && sessions.length > 0);

  return (
    <VStack gap={4} align="stretch" width="full">
      <Grid
        templateColumns="repeat(7, minmax(0, 1fr))"
        gap={0}
        role="group"
        aria-label="Next seven days"
      >
        {days.map((day) => (
          <WeekDayCell
            key={day.date}
            day={day}
            selected={day.date === selected.date}
            onSelect={setSelectedDate}
          />
        ))}
      </Grid>

      <DaySessionPanel day={selected} hasPlan={hasPlan} />

      {planId ? (
        <Link href={`/session-plans/${planId}`} style={{ textDecoration: "none" }}>
          <Text fontSize="xs" color="fg.muted" _hover={{ opacity: 0.85 }}>
            View plan details →
          </Text>
        </Link>
      ) : null}
    </VStack>
  );
}
