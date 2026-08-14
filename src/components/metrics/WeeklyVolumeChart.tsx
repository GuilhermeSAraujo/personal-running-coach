"use client";

import { formatDistanceKm } from "@/lib/activityFormat";
import type { MetricsWeekPoint } from "@/services/metrics/types";
import { Chart, useChart } from "@chakra-ui/charts";
import { Card, Heading, Text, VStack } from "@chakra-ui/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PREVIEW_BAR_OPACITY,
  PREVIEW_SUPPORTING_LINE,
  previewTooltipLabel,
} from "./chartPreview";

type Props = { weeks: MetricsWeekPoint[] };

export function WeeklyVolumeChart({ weeks }: Props) {
  const chart = useChart({
    data: weeks.map((w) => ({
      label: w.label,
      distanceKm: w.distanceKm,
      isPreview: w.isPreview,
    })),
    series: [{ name: "distanceKm", label: "Distance (km)", color: "orange.solid" }],
  });

  return (
    <Card.Root width="full">
      <Card.Header>
        <Heading size="sm">Weekly volume</Heading>
        <Text fontSize="xs" color="fg.muted">
          Distance per week (km). {PREVIEW_SUPPORTING_LINE}
        </Text>
      </Card.Header>
      <Card.Body>
        <VStack width="full" height="220px">
          <Chart.Root chart={chart} width="full" height="100%">
            <BarChart data={chart.data} responsive>
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
              />
              <Tooltip
                content={
                  <Chart.Tooltip
                    labelFormatter={previewTooltipLabel}
                    formatter={(value) =>
                      value == null || !Number.isFinite(Number(value))
                        ? "—"
                        : formatDistanceKm(Number(value))
                    }
                  />
                }
              />
              {chart.series.map((item) => (
                <Bar
                  key={item.name}
                  dataKey={chart.key(item.name)}
                  fill={chart.color(item.color)}
                  radius={[4, 4, 0, 0]}
                >
                  {weeks.map((week) => (
                    <Cell
                      key={week.weekStart}
                      fill={chart.color(item.color)}
                      fillOpacity={week.isPreview ? PREVIEW_BAR_OPACITY : 1}
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </Chart.Root>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
