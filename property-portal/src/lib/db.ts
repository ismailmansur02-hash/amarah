import { Pool, types } from "pg";
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
types.setTypeParser(types.builtins.NUMERIC, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(types.builtins.INT8, (v) => (v === null ? null : parseInt(v, 10)));
types.setTypeParser(types.builtins.DATE, (v) => v); // already 'YYYY-MM-DD'
types.setTypeParser(types.builtins.TIMESTAMPTZ, (v) => (v ? new Date(v).toISOString() : v));
types.setTypeParser(types.builtins.TIMESTAMP, (v) => (v ? new Date(v + "Z").toISOString() : v));

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Point it at the Supabase connection string " +
          "(Supabase dashboard → Connect → Transaction pooler)."
      );
    }
    const isLocal = /@(localhost|127\.0\.0\.1)/.test(connectionString);
    pool = new Pool({
      connectionString,
      // Each serverless instance keeps its own pool, so keep them small and
      // let idle connections go rather than holding pooler slots open.
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      // Supabase terminates TLS at its pooler with a certificate that does not
      // chain to the public roots, so the chain is not verified. Traffic is
      // still encrypted. To verify it, download Supabase's CA and pass
      // { ca, rejectUnauthorized: true } here instead.
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

/** `await sql\`SELECT ...\`` resolves to an array of row objects. */
export function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
  return query<T>(text, values);
}

/** First row of a query, or undefined when there are none. */
export async function one<T>(q: Promise<unknown[]>): Promise<T | undefined> {
  return (await q)[0] as T | undefined;
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
  const params: unknown[] = [];
  const rows = RENT_READY_TEMPLATE.map((step, i) => {
    const b = i * 4;
    params.push(propertyId, i + 1, step.title, step.description);
    return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`;
  });
  await query(
    `INSERT INTO checklist_steps (property_id, position, title, description) VALUES ${rows.join(", ")}`,
    params
  );
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

  const row = await one<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM portal_users`);
  if (row && row.n > 0) {
    bootstrapDone = true;
    return;
  }

  const password = process.env.INITIAL_MANAGER_PASSWORD;
  if (!password) {
    throw new Error(
      "The database has no users yet and INITIAL_MANAGER_PASSWORD is not set. " +
        "Set it in the site's environment variables so the first manager login can be created."
    );
  }

  await sql`
    INSERT INTO portal_users (username, password_hash, name, email, role)
    VALUES (${(process.env.INITIAL_MANAGER_USERNAME || "manager").toLowerCase()},
            ${bcrypt.hashSync(password, 10)},
            ${process.env.INITIAL_MANAGER_NAME || "Property Manager"},
            ${process.env.INITIAL_MANAGER_EMAIL || ""}, 'manager')
    ON CONFLICT (username) DO NOTHING`;
  bootstrapDone = true;
}
