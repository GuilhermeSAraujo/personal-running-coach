import type { ReactNode } from "react";
import type { MetricsWeekPoint } from "@/services/metrics/types";

export const PREVIEW_BAR_OPACITY = 0.45;
export const PREVIEW_SUPPORTING_LINE =
  "Last point is this week (in progress)";
export const CONSISTENCY_RUNS_PER_WEEK_GOAL = 4;
export const GOAL_LINE_DASHARRAY = "4 4";

export function yDomainIncludingGoal(
  goal: number,
): [number, (dataMax: number) => number] {
  return [
    0,
    (dataMax) => Math.max(goal, Number.isFinite(dataMax) ? dataMax : 0),
  ];
}

type PreviewPayloadItem = {
  payload?: { isPreview?: boolean };
  dataKey?: unknown;
  value?: unknown;
};

export function previewTooltipLabel(
  label: ReactNode,
  payload: readonly PreviewPayloadItem[],
): ReactNode {
  const text =
    typeof label === "string" || typeof label === "number" ? String(label) : "";
  return payload[0]?.payload?.isPreview ? `${text} (in progress)` : label;
}

export function filterPreviewTooltipPayload<T extends PreviewPayloadItem>(
  payload: readonly T[] | undefined,
): T[] {
  return [...(payload ?? [])].filter((item) => {
    if (item.value == null) return false;
    const key = String(item.dataKey ?? "");
    const isPreviewPoint = item.payload?.isPreview === true;
    if (key === "preview") return isPreviewPoint;
    if (isPreviewPoint) return false;
    return true;
  });
}

export function withPreviewLineSeries(
  weeks: MetricsWeekPoint[],
  getValue: (week: MetricsWeekPoint) => number | null,
): Array<{
  label: string;
  isPreview: boolean;
  value: number | null;
  preview: number | null;
}> {
  return weeks.map((week, index) => {
    const value = getValue(week);
    const next = weeks[index + 1];
    const isBridge = !week.isPreview && next?.isPreview === true;
    return {
      label: week.label,
      isPreview: week.isPreview,
      value: week.isPreview ? null : value,
      preview: week.isPreview || isBridge ? value : null,
    };
  });
}
