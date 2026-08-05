import NextAuth from "next-auth"
import Strava from "next-auth/providers/strava"
import { dbConnect } from "@/lib/db"
import { User } from "@/models"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Strava({
      clientId: process.env.STRAVA_CLIENT_ID,
      clientSecret: process.env.STRAVA_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "read,activity:read_all",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "strava") {
        return false
      }

      if (
        !account.access_token ||
        !account.refresh_token ||
        account.expires_at == null ||
        !account.providerAccountId
      ) {
        return false
      }

      const athleteId = Number(account.providerAccountId)
      if (!Number.isFinite(athleteId)) {
        return false
      }

      const stravaProfile = profile as
        | { firstname?: string; lastname?: string }
        | undefined
      const nameFromProfile = [stravaProfile?.firstname, stravaProfile?.lastname]
        .filter(Boolean)
        .join(" ")
      const name = user.name?.trim() || nameFromProfile || `Athlete ${athleteId}`
      const email = user.email?.trim() || `${athleteId}@strava.local`

      await dbConnect()
      await User.findOneAndUpdate(
        { "strava.athleteId": athleteId },
        {
          $set: {
            "strava.accessToken": account.access_token,
            "strava.refreshToken": account.refresh_token,
            "strava.expiresAt": new Date(account.expires_at * 1000),
            "profile.name": name,
            "profile.email": email,
          },
          $setOnInsert: {
            "strava.athleteId": athleteId,
            coaching: {},
          },
        },
        { upsert: true },
      )

      return true
    },
    async jwt({ token, account }) {
      if (account?.provider === "strava" && account.providerAccountId) {
        token.stravaAthleteId = Number(account.providerAccountId)
      }
      return token
    },
    async session({ session, token }) {
      if (token.stravaAthleteId != null) {
        session.stravaAthleteId = token.stravaAthleteId
      }
      return session
    },
  },
})
