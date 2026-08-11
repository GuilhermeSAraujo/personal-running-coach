import { formatDistanceKm } from "@/lib/activityFormat";
import type { MetricsKpis } from "@/services/metrics/types";
import { SimpleGrid, Text, VStack } from "@chakra-ui/react";

function paceTrendLabel(trend: MetricsKpis["paceTrend"]): string {
  if (trend === "improving") return "Improving";
  if (trend === "stable") return "Stable";
  if (trend === "declining") return "Declining";
  return "—";
}

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <VStack gap={0.5} align="start" p={3} borderWidth="1px" borderRadius="md">
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontWeight="semibold" fontSize="md">
        {value}
      </Text>
    </VStack>
  );
}

type Props = { kpis: MetricsKpis };

export function MetricsKpiStrip({ kpis }: Props) {
  return (
    <SimpleGrid columns={2} gap={3} width="full">
      <KpiCell
        label="This week"
        value={formatDistanceKm(kpis.currentWeekVolumeKm)}
      />
      <KpiCell
        label="Runs / week (4w)"
        value={kpis.averageRunsPerWeek4w.toFixed(1)}
      />
      <KpiCell
        label="Longest run"
        value={formatDistanceKm(kpis.currentLongestKm)}
      />
      <KpiCell label="Pace trend" value={paceTrendLabel(kpis.paceTrend)} />
    </SimpleGrid>
  );
}
