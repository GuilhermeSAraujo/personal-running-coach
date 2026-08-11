"use client";

import { formatDistanceKm } from "@/lib/activityFormat";
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

type Props = { weeks: MetricsWeekPoint[] };

export function LongRunChart({ weeks }: Props) {
  const chart = useChart({
    data: weeks.map((w) => ({
      label: w.label,
      longestRunKm: w.longestRunKm,
    })),
    series: [
      { name: "longestRunKm", label: "Longest (km)", color: "teal.solid" },
    ],
  });

  return (
    <Card.Root width="full">
      <Card.Header>
        <Heading size="sm">Long run</Heading>
        <Text fontSize="xs" color="fg.muted">
          Longest run each week (km)
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
              />
              <Tooltip
                content={
                  <Chart.Tooltip
                    formatter={(value) =>
                      value == null || !Number.isFinite(Number(value))
                        ? "—"
                        : formatDistanceKm(Number(value))
                    }
                  />
                }
              />
              {chart.series.map((item) => (
                <Line
                  key={item.name}
                  type="monotone"
                  dataKey={chart.key(item.name)}
                  stroke={chart.color(item.color)}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </Chart.Root>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
