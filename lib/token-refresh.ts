import type { JWT } from "next-auth/jwt";

export function tokenExpiry(accessToken?: string): number {
  try {
    const payload = JSON.parse(Buffer.from(accessToken!.split(".")[1], "base64url").toString());
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch { return 0; }
}

const refreshes = new Map<string, { expires: number; promise: Promise<{ accessToken: string; accessTokenExpires: number }> }>();
export async function ensureAccessToken(token: JWT, baseUrl: string, forceRefresh = false): Promise<JWT> {
  if (token.error) return token;
  if (!forceRefresh && token.accessToken && Date.now() < (token.accessTokenExpires || tokenExpiry(token.accessToken)) - 30_000) return token;
  return refreshAccessToken(token, baseUrl);
}

export async function refreshAccessToken(token: JWT, baseUrl: string): Promise<JWT> {
  if (!token.refreshToken) return { ...token, accessToken: undefined, error: "RefreshTokenError" };
  const refreshToken = token.refreshToken;
  for (const [key, entry] of refreshes) if (entry.expires <= Date.now()) refreshes.delete(key);
  let entry = refreshes.get(refreshToken);
  if (!entry) {
    const promise = (async () => {
      const response = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }), cache: "no-store", signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json();
      const accessToken = result.data?.accessToken;
      const accessTokenExpires = tokenExpiry(accessToken);
      if (!response.ok || !result.success || !accessToken || accessTokenExpires <= Date.now()) throw new Error("Token refresh failed");
      return { accessToken, accessTokenExpires };
    })();
    entry = { promise, expires: Infinity };
    refreshes.set(refreshToken, entry);
    // Share the result across parallel requests and shortly afterwards.
    const current = entry;
    void promise.then(() => { current.expires = Date.now() + 5_000; }, () => { current.expires = Date.now() + 5_000; });
  }
  try { return { ...token, ...await entry.promise, error: undefined }; }
  catch { return { ...token, accessToken: undefined, refreshToken: undefined, error: "RefreshTokenError" }; }
}
