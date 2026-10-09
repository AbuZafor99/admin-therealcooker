import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { BASE_URL, loginApi } from "@/lib/api";
import { ensureAccessToken, tokenExpiry } from "@/lib/token-refresh";
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, pages: { signIn: "/login" }, session: { strategy: "jwt" },
  providers: [Credentials({ credentials: { email: {}, password: {} }, async authorize(credentials) { if (!credentials?.email || !credentials?.password) return null; const user = await loginApi({ email: String(credentials.email), password: String(credentials.password) }); if (user.role !== "admin") throw new Error("Only administrators can access this dashboard"); return { id: user._id, _id: user._id, name: user.name, email: user.email, image: user.avatar?.url, role: user.role, accessToken: user.accessToken, refreshToken: user.refreshToken }; } })],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) return { ...token, accessToken: user.accessToken, refreshToken: user.refreshToken, accessTokenExpires: tokenExpiry(user.accessToken), role: user.role, _id: user._id || user.id, image: user.image, error: undefined };
      const forceRefresh = trigger === "update" && session?.refreshAccessToken === true;
      return ensureAccessToken(token, BASE_URL, forceRefresh);
    },
    session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.role = token.role;
      session._id = token._id;
      session.user.role = token.role;
      session.user._id = token._id;
      session.user.image = token.image || session.user.image;
      // Refresh token remains in the encrypted HttpOnly JWT cookie.
      return session;
    },
    authorized({ auth }) { return Boolean(auth?.user && auth.role === "admin" && auth.accessToken && !auth.error); }
  }
});
