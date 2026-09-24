import type { Config } from "@netlify/functions";
import { Client } from "pg";

/**
 * Keeps the Supabase project awake, and wakes it again if it does go to sleep.
 *
 * Supabase pauses a free-tier project after about a week without activity.
 * When that happens the portal goes down: nobody can sign in, and the sign-in
 * screen looks exactly like a wrong password. A quiet week is entirely normal
 * for a property manager — nobody logs in between rent cycles — so the app
 * would put itself to sleep precisely when it looks most broken.
 *
 * Two jobs, in order:
 *
 *   1. Touch the database so the idle timer never runs out. This is the part
 *      that prevents the outage.
 *   2. If the touch fails, ask Supabase to restore the project. This is the
 *      part that ends an outage that already started — without it, a single
 *      missed window leaves the portal down until somebody notices by hand,
 *      because a paused project cannot be woken by connecting to it.
 *
 * Step 2 needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF in the site's
 * environment. Without them the function still does step 1 and simply says
 * what it would have done. Both steps become unnecessary on a paid plan,
 * which does not pause.
 */

const PING_TIMEOUT_MS = 8_000;

async function databaseReachable(connectionString: string): Promise<boolean> {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: PING_TIMEOUT_MS,
    query_timeout: PING_TIMEOUT_MS,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch (err) {
    console.error("keep-database-awake: could not reach the database", err);
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

/** Asks Supabase to bring a paused project back up. Returns what it did. */
async function restorePausedProject(): Promise<string> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;

  if (!token || !ref) {
    return "cannot self-heal: SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are not set";
  }

  const headers = { Authorization: `Bearer ${token}` };

  const statusRes = await fetch(`https://api.supabase.com/v1/projects/${ref}`, { headers });
  if (!statusRes.ok) {
    return `could not read project status (${statusRes.status})`;
  }

  const { status } = (await statusRes.json()) as { status?: string };

  // Only INACTIVE means paused. If it is already coming up, or up and merely
  // unreachable from here, a restore call would be wrong.
  if (status !== "INACTIVE") {
    return `project status is ${status ?? "unknown"} — not requesting a restore`;
  }

  const restoreRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/restore`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: "{}",
  });

  return restoreRes.ok
    ? "project was paused — restore requested"
    : `restore request failed (${restoreRes.status})`;
}

export default async function handler(): Promise<Response> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("keep-database-awake: DATABASE_URL is not set");
    return new Response("DATABASE_URL is not set", { status: 500 });
  }

  if (await databaseReachable(connectionString)) {
    console.log("keep-database-awake: database reachable");
    return new Response("ok");
  }

  let outcome: string;
  try {
    outcome = await restorePausedProject();
  } catch (err) {
    outcome = `restore attempt threw: ${(err as Error).message}`;
  }

  // Loud, because this line is the record of an outage and of what was done
  // about it.
  console.error(`keep-database-awake: database unreachable — ${outcome}`);
  return new Response(`database unreachable — ${outcome}`, { status: 503 });
}

/*
 * Every six hours rather than daily. The idle window is about a week, so daily
 * looked like plenty — but it gives no margin: one run that fails to fire and
 * the streak is broken silently. Four a day costs nothing and means three
 * runs would have to miss before anything is at risk.
 */
export const config: Config = {
  schedule: "0 */6 * * *",
};
