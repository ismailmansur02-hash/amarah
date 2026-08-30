import type { Config } from "@netlify/functions";
import { Client } from "pg";

/**
 * Keeps the Supabase project from being paused.
 *
 * Supabase pauses a free-tier project after about a week without activity.
 * When that happens the portal goes down: clients see errors, and someone
 * with dashboard access has to wake it by hand. A quiet week is entirely
 * normal for a property manager — nobody logs in between rent cycles — so
 * the app would put itself to sleep exactly when it looks most broken.
 *
 * Touching the database on a schedule means the idle timer never runs out.
 * Removing this is fine once the project is on a paid plan, which does not
 * pause.
 */
export default async function handler(): Promise<Response> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("keep-database-awake: DATABASE_URL is not set");
    return new Response("DATABASE_URL is not set", { status: 500 });
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8_000,
    query_timeout: 8_000,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    console.log("keep-database-awake: database reachable");
    return new Response("ok");
  } catch (err) {
    // Worth a loud log: if this starts failing, the project is probably
    // already paused and the portal is down.
    console.error("keep-database-awake: could not reach the database", err);
    return new Response("could not reach the database", { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}

// Daily, well inside the roughly one-week idle window.
export const config: Config = {
  schedule: "0 6 * * *",
};
