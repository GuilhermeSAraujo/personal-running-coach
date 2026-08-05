import type { UserDocument } from "@/models";
import {
  StravaApiError,
  type StravaSummaryActivity,
  type StravaTokenResponse,
} from "./types";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";
const REFRESH_BUFFER_MS = 60 * 60 * 1000;

function requireStravaCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET");
  }
  return { clientId, clientSecret };
}

export async function refreshStravaToken(
  refreshToken: string,
): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = requireStravaCredentials();

  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new StravaApiError(
      `Strava token refresh failed: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at * 1000),
  };
}

export async function ensureUserAccessToken(
  user: UserDocument,
): Promise<string> {
  const expiresAt = user.strava.expiresAt.getTime();
  if (expiresAt - Date.now() > REFRESH_BUFFER_MS) {
    return user.strava.accessToken;
  }

  const tokens = await refreshStravaToken(user.strava.refreshToken);
  user.strava.accessToken = tokens.accessToken;
  user.strava.refreshToken = tokens.refreshToken;
  user.strava.expiresAt = tokens.expiresAt;
  await user.save();
  return tokens.accessToken;
}

export async function listAthleteActivities(options: {
  accessToken: string;
  page: number;
  perPage: number;
  after?: number;
}): Promise<StravaSummaryActivity[]> {
  const url = new URL(STRAVA_ACTIVITIES_URL);
  url.searchParams.set("page", String(options.page));
  url.searchParams.set("per_page", String(options.perPage));
  if (options.after != null) {
    url.searchParams.set("after", String(options.after));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new StravaApiError(
      `Strava list activities failed: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  return (await response.json()) as StravaSummaryActivity[];
}
