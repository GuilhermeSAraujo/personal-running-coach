"use client";

import type { MetricsWeekPoint } from "@/services/metrics/types";
import { Chart, useChart } from "@chakra-ui/charts";
import { Card, Heading, Text, VStack } from "@chakra-ui/react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

type Props = { weeks: MetricsWeekPoint[] };

export function ConsistencyChart({ weeks }: Props) {
  const chart = useChart({
    data: weeks.map((w) => ({ label: w.label, runs: w.runs })),
    series: [{ name: "runs", label: "Runs", color: "blue.solid" }],
  });

  return (
    <Card.Root width="full">
      <Card.Header>
        <Heading size="sm">Consistency</Heading>
        <Text fontSize="xs" color="fg.muted">
          Runs per week
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
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={28}
              />
              <Tooltip
                content={
                  <Chart.Tooltip
                    formatter={(value) =>
                      value == null || !Number.isFinite(Number(value))
                        ? "—"
                        : `${Number(value)} runs`
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
