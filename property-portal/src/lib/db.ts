import { getDatabase } from "@netlify/database";
import pg from "pg";
import bcrypt from "bcryptjs";
import { RENT_READY_TEMPLATE } from "./rentReadyTemplate";

/*
 * Postgres value decoding.
 *
 * node-postgres hands back NUMERIC as a string and DATE/TIMESTAMPTZ as JS
 * Date objects. The app does arithmetic on money and string formatting on
 * dates, so decode them to the shapes the rest of the code expects: numbers,
 * 'YYYY-MM-DD', and ISO timestamps.
 */
const { builtins } = pg.types;
pg.types.setTypeParser(builtins.NUMERIC, (v) => (v === null ? null : parseFloat(v)));
pg.types.setTypeParser(builtins.INT8, (v) => (v === null ? null : parseInt(v, 10)));
pg.types.setTypeParser(builtins.DATE, (v) => v); // already 'YYYY-MM-DD'
pg.types.setTypeParser(builtins.TIMESTAMPTZ, (v) => (v ? new Date(v).toISOString() : v));
pg.types.setTypeParser(builtins.TIMESTAMP, (v) => (v ? new Date(v + "Z").toISOString() : v));

/**
 * On Netlify the connection string is supplied automatically by Netlify DB.
 * Locally, DATABASE_URL points at any Postgres instance.
 */
let cached: ReturnType<typeof getDatabase> | null = null;

export function db() {
  if (!cached) {
    const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    cached = connectionString ? getDatabase({ connectionString }) : getDatabase();
  }
  return cached;
}

/** `await sql\`SELECT ...\`` resolves to an array of row objects. */
export function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  return db().sql(strings, ...values) as unknown as Promise<T[]>;
}

/** First row of a query, or undefined when there are none. */
export async function one<T>(query: Promise<unknown[]>): Promise<T | undefined> {
  return (await query)[0] as T | undefined;
}

export async function logActivity(
  propertyId: number,
  actorId: number | null,
  action: string,
  detail = "",
  when?: string
) {
  if (when) {
    await sql`INSERT INTO activity_log (property_id, actor_id, action, detail, created_at)
              VALUES (${propertyId}, ${actorId}, ${action}, ${detail}, ${when}::timestamptz)`;
  } else {
    await sql`INSERT INTO activity_log (property_id, actor_id, action, detail)
              VALUES (${propertyId}, ${actorId}, ${action}, ${detail})`;
  }
}

export async function createChecklistFromTemplate(propertyId: number) {
  const rows = db().sql.values(
    RENT_READY_TEMPLATE.map((step, i) => [propertyId, i + 1, step.title, step.description])
  );
  await sql`INSERT INTO checklist_steps (property_id, position, title, description) VALUES ${rows}`;
}

/**
 * Creates the manager login the first time the app runs against an empty
 * database. Serverless has no startup hook, so this runs from the login
 * route. Idempotent — the UNIQUE username constraint means a race between
 * two concurrent instances still leaves exactly one account.
 */
let bootstrapDone = false;

export async function ensureBootstrapManager() {
  if (bootstrapDone) return;

  const row = await one<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM users`);
  if (row && row.n > 0) {
    bootstrapDone = true;
    return;
  }

  const password = process.env.INITIAL_MANAGER_PASSWORD;
  if (!password) {
    throw new Error(
      "The database has no users yet and INITIAL_MANAGER_PASSWORD is not set. " +
        "Set it in the Netlify site's environment variables so the first manager login can be created."
    );
  }

  await sql`
    INSERT INTO users (username, password_hash, name, email, role)
    VALUES (${(process.env.INITIAL_MANAGER_USERNAME || "manager").toLowerCase()},
            ${bcrypt.hashSync(password, 10)},
            ${process.env.INITIAL_MANAGER_NAME || "Property Manager"},
            ${process.env.INITIAL_MANAGER_EMAIL || ""}, 'manager')
    ON CONFLICT (username) DO NOTHING`;
  bootstrapDone = true;
}
