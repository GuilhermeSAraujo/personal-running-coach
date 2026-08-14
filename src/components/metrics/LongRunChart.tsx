"use client";

import { formatDistanceKm } from "@/lib/activityFormat";
import type { MetricsWeekPoint } from "@/services/metrics/types";
import { Chart, useChart } from "@chakra-ui/charts";
import { Card, Heading, Text, VStack } from "@chakra-ui/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  GOAL_LINE_DASHARRAY,
  PREVIEW_SUPPORTING_LINE,
  filterPreviewTooltipPayload,
  previewTooltipLabel,
  withPreviewLineSeries,
  yDomainIncludingGoal,
} from "./chartPreview";

type Props = { weeks: MetricsWeekPoint[]; goalKm: number | null };

export function LongRunChart({ weeks, goalKm }: Props) {
  const chart = useChart({
    data: withPreviewLineSeries(weeks, (w) => w.longestRunKm),
    series: [
      { name: "value", label: "Longest (km)", color: "teal.solid" },
      { name: "preview", label: "Longest (km)", color: "teal.solid" },
    ],
  });

  return (
    <Card.Root width="full">
      <Card.Header>
        <Heading size="sm">Long run</Heading>
        <Text fontSize="xs" color="fg.muted">
          Longest run each week (km).
          {goalKm != null ? ` Goal: ${formatDistanceKm(goalKm)}.` : ""}{" "}
          {PREVIEW_SUPPORTING_LINE}
        </Text>
      </Card.Header>
      <Card.Body>
        <VStack width="full" height="220px">
          <Chart.Root chart={chart} width="full" height="100%">
            <LineChart data={chart.data} responsive>
              <CartesianGrid stroke={chart.color("border")} vertical={false} />
              <XAxis
                dataKey={chart.key("label")}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={36}
                domain={
                  goalKm != null ? yDomainIncludingGoal(goalKm) : undefined
                }
              />
              {goalKm != null ? (
                <ReferenceLine
                  y={goalKm}
                  stroke={chart.color("fg.muted")}
                  strokeDasharray={GOAL_LINE_DASHARRAY}
                />
              ) : null}
              <Tooltip
                content={({ payload, label }) => (
                  <Chart.Tooltip
                    payload={filterPreviewTooltipPayload(payload)}
                    label={label}
                    labelFormatter={previewTooltipLabel}
                    formatter={(value) =>
                      value == null || !Number.isFinite(Number(value))
                        ? "—"
                        : formatDistanceKm(Number(value))
                    }
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey={chart.key("value")}
                stroke={chart.color("teal.solid")}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey={chart.key("preview")}
                stroke={chart.color("teal.solid")}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </Chart.Root>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
