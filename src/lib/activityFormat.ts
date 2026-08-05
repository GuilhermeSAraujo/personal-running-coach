export function formatDistanceKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function formatPace(paceSecondsPerKm: number): string {
  if (!Number.isFinite(paceSecondsPerKm) || paceSecondsPerKm < 0) {
    return "—";
  }
  const total = Math.round(paceSecondsPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "—";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatActivityDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatActivityType(type: string): string {
  if (type === "run") return "Run";
  if (type === "walk") return "Walk";
  return type;
}
