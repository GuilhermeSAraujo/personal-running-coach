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

type Props = { weeks: MetricsWeekPoint[] };

export function PaceTrendChart({ weeks }: Props) {
  const chart = useChart({
    data: weeks.map((w) => ({
      label: w.label,
      averagePaceSecondsPerKm: w.averagePaceSecondsPerKm,
    })),
    series: [
      {
        name: "averagePaceSecondsPerKm",
        label: "Avg pace",
        color: "purple.solid",
      },
    ],
  });

  return (
    <Card.Root width="full">
      <Card.Header>
        <Heading size="sm">Pace trend</Heading>
        <Text fontSize="xs" color="fg.muted">
          Average pace (faster is higher)
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
                content={
                  <Chart.Tooltip
                    formatter={(value) =>
                      value == null || !Number.isFinite(Number(value))
                        ? "—"
                        : formatPace(Number(value))
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
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </Chart.Root>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
