import type { Session } from "next-auth";

let logoutPromise: Promise<unknown> | undefined;
export function logoutSession() {
  if (!logoutPromise) {
    logoutPromise = import("next-auth/react").then(({ signOut }) => signOut({ callbackUrl: "/login" }));
    void logoutPromise.catch(() => { logoutPromise = undefined; });
  }
  return logoutPromise;
}

export async function refreshClientSession(): Promise<Session | null> {
  const { getCsrfToken, getSession } = await import("next-auth/react");
  const response = await fetch("/api/auth/session", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csrfToken: await getCsrfToken(), data: { refreshAccessToken: true } }),
  });
  if (!response.ok) return null;
  const session: Session | null = await response.json();
  if (!session?.accessToken || session.error) return null;
  // Broadcast the updated session to SessionProvider and other tabs.
  return getSession();
}
