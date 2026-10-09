import "next-auth";
import "next-auth/jwt";
declare module "next-auth" { interface Session { accessToken?: string; error?: "RefreshTokenError"; role?: string; _id?: string; user: { name?: string | null; email?: string | null; image?: string | null; role?: string; _id?: string }; } interface User { accessToken?: string; refreshToken?: string; role?: string; _id?: string; image?: string | null; } }
declare module "next-auth/jwt" { interface JWT { accessToken?: string; refreshToken?: string; accessTokenExpires?: number; error?: "RefreshTokenError"; role?: string; _id?: string; image?: string | null; } }
