import Constants from "expo-constants";

/**
 * The mobile app talks to exactly the same HTTP API as the web app — the routes
 * under /api in apps/web. There is no second backend and no duplicated business
 * logic: pricing, matching and the safeguarding filter all live in
 * @project-ta/shared and run on the server.
 *
 * Point this at your local machine while developing:
 *   EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:3000 npx expo start
 */
const FALLBACK = "https://project-ta.netlify.app";

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
  FALLBACK;

/**
 * React Native has no cookie jar we can rely on across platforms, so the session
 * id is held in memory and sent as a header. The web app uses an httpOnly cookie;
 * the API accepts either.
 */
let sessionUserId: string | null = null;

export function setSessionUser(id: string | null): void {
  sessionUserId = id;
}

export function getSessionUser(): string | null {
  return sessionUserId;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(sessionUserId ? { "x-pta-user": sessionUserId } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return body as T;
}
