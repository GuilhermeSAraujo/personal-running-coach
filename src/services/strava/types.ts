export interface StravaSummaryActivity {
  id: number;
  sport_type?: string;
  type?: string;
  start_date: string;
  distance: number;
  moving_time: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number | null;
}

export interface StravaTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class StravaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StravaApiError";
  }
}
