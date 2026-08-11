"use client";

import { formatDistanceKm } from "@/lib/activityFormat";
import type { MetricsWeekPoint } from "@/services/metrics/types";
import { Chart, useChart } from "@chakra-ui/charts";
import { Card, Heading, Text, VStack } from "@chakra-ui/react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

type Props = { weeks: MetricsWeekPoint[] };

export function WeeklyVolumeChart({ weeks }: Props) {
  const chart = useChart({
    data: weeks.map((w) => ({
      label: w.label,
      distanceKm: w.distanceKm,
    })),
    series: [{ name: "distanceKm", label: "Distance (km)", color: "orange.solid" }],
  });

  return (
    <Card.Root width="full">
      <Card.Header>
        <Heading size="sm">Weekly volume</Heading>
        <Text fontSize="xs" color="fg.muted">
          Distance per week (km)
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
                />
              ))}
            </BarChart>
          </Chart.Root>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
