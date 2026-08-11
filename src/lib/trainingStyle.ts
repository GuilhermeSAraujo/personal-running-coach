export const TRAINING_STYLES = ["preset", "adaptive"] as const;
export type TrainingStyle = (typeof TRAINING_STYLES)[number];

export function isTrainingStyle(value: unknown): value is TrainingStyle {
  return (
    typeof value === "string" &&
    (TRAINING_STYLES as readonly string[]).includes(value)
  );
}
