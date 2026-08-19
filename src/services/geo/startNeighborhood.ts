import {
  lookupStartNeighborhood,
  parseStartLatLng,
  type StartLatLng,
} from "./nominatim";

export const SYNC_GEOCODE_MAX = 10;

export type NeighborhoodLookup = (
  lat: number,
  lon: number,
) => Promise<string | undefined>;

export function shouldGeocodeDuringSync(upsertedCount: number): boolean {
  return upsertedCount > 0 && upsertedCount <= SYNC_GEOCODE_MAX;
}

export function readStoredStartNeighborhood(raw: unknown): string | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const value = (raw as { start_neighborhood?: unknown }).start_neighborhood;
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function mergeStartNeighborhood(
  raw: unknown,
  neighborhood: string,
): unknown {
  if (raw != null && typeof raw === "object") {
    return { ...(raw as object), start_neighborhood: neighborhood };
  }
  return { start_neighborhood: neighborhood };
}

export function readStartLatLngFromRaw(raw: unknown): StartLatLng | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  return parseStartLatLng((raw as { start_latlng?: unknown }).start_latlng);
}

export async function resolveStartNeighborhood(
  raw: unknown,
  lookup: NeighborhoodLookup = lookupStartNeighborhood,
): Promise<string | undefined> {
  const stored = readStoredStartNeighborhood(raw);
  if (stored) {
    return stored;
  }

  const coords = readStartLatLngFromRaw(raw);
  if (!coords) {
    return undefined;
  }

  try {
    return await lookup(coords.lat, coords.lon);
  } catch {
    return undefined;
  }
}
