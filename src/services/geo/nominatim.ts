const NOMINATIM_REVERSE_URL =
  "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_USER_AGENT =
  "personal-running-coach/0.1 (local reverse-geocode)";

export type StartLatLng = {
  lat: number;
  lon: number;
};

function toCoord(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    return undefined;
  }
  if (value != null && typeof value === "object" && "valueOf" in value) {
    const parsed = Number((value as { valueOf: () => unknown }).valueOf());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function parseStartLatLng(raw: unknown): StartLatLng | undefined {
  if (!Array.isArray(raw) || raw.length !== 2) {
    return undefined;
  }

  const lat = toCoord(raw[0]);
  const lon = toCoord(raw[1]);
  if (lat == null || lon == null) {
    return undefined;
  }
  if (lat === 0 && lon === 0) {
    return undefined;
  }

  return { lat, lon };
}

export function pickStartNeighborhood(address: unknown): string | undefined {
  if (address == null || typeof address !== "object") {
    return undefined;
  }

  const record = address as Record<string, unknown>;
  if (typeof record.neighbourhood === "string" && record.neighbourhood.trim()) {
    return record.neighbourhood;
  }
  if (typeof record.suburb === "string" && record.suburb.trim()) {
    return record.suburb;
  }
  return undefined;
}

export async function lookupStartNeighborhood(
  lat: number,
  lon: number,
): Promise<string | undefined> {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });
    if (!response.ok) {
      return undefined;
    }
    const payload: unknown = await response.json();
    if (payload == null || typeof payload !== "object") {
      return undefined;
    }
    return pickStartNeighborhood(
      (payload as { address?: unknown }).address,
    );
  } catch {
    return undefined;
  }
}
