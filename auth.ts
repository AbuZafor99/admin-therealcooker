import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginApi } from "@/lib/api";
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, pages: { signIn: "/login" }, session: { strategy: "jwt" },
  providers: [Credentials({ credentials: { email: {}, password: {} }, async authorize(credentials) { if (!credentials?.email || !credentials?.password) return null; const user = await loginApi({ email: String(credentials.email), password: String(credentials.password) }); if (user.role !== "admin") throw new Error("Only administrators can access this dashboard"); return { id: user._id, _id: user._id, name: user.name, email: user.email, image: user.avatar?.url, role: user.role, accessToken: user.accessToken }; } })],
  callbacks: { jwt({ token, user }) { if (user) { token.accessToken = user.accessToken; token.role = user.role; token._id = user._id || user.id; token.image = user.image; } return token; }, session({ session, token }) { session.accessToken = token.accessToken; session.role = token.role; session._id = token._id; session.user.role = token.role; session.user._id = token._id; session.user.image = token.image || session.user.image; return session; }, authorized({ auth }) { return Boolean(auth?.user && auth.role === "admin"); } }
});
