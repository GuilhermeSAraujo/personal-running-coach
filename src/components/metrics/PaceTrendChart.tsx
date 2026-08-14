"use client";

import { formatPace } from "@/lib/activityFormat";
import type { MetricsWeekPoint } from "@/services/metrics/types";
import { Chart, useChart } from "@chakra-ui/charts";
import { Card, Heading, Text, VStack } from "@chakra-ui/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PREVIEW_SUPPORTING_LINE,
  filterPreviewTooltipPayload,
  previewTooltipLabel,
  withPreviewLineSeries,
} from "./chartPreview";

type Props = { weeks: MetricsWeekPoint[] };

export function PaceTrendChart({ weeks }: Props) {
  const chart = useChart({
    data: withPreviewLineSeries(weeks, (w) => w.averagePaceSecondsPerKm),
    series: [
      { name: "value", label: "Avg pace", color: "purple.solid" },
      { name: "preview", label: "Avg pace", color: "purple.solid" },
    ],
  });

  return (
    <Card.Root width="full">
      <Card.Header>
        <Heading size="sm">Pace trend</Heading>
        <Text fontSize="xs" color="fg.muted">
          Average pace (faster is higher). {PREVIEW_SUPPORTING_LINE}
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
                reversed
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={52}
                tickFormatter={(value: number) =>
                  Number.isFinite(value)
                    ? formatPace(value).replace(" /km", "")
                    : ""
                }
              />
              <Tooltip
                content={({ payload, label }) => (
                  <Chart.Tooltip
                    payload={filterPreviewTooltipPayload(payload)}
                    label={label}
                    labelFormatter={previewTooltipLabel}
                    formatter={(value) =>
                      value == null || !Number.isFinite(Number(value))
                        ? "—"
                        : formatPace(Number(value))
                    }
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey={chart.key("value")}
                stroke={chart.color("purple.solid")}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey={chart.key("preview")}
                stroke={chart.color("purple.solid")}
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
