import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    stravaAthleteId?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    stravaAthleteId?: number;
  }
}
