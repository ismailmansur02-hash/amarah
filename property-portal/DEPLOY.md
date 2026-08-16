# Deploying E, Management

The app runs on **Netlify** as serverless functions, with data in **Supabase**
(Postgres) and uploaded documents in **Netlify Blobs**.

Netlify functions have no persistent filesystem — anything written to disk
disappears on the next deploy or cold start — which is why nothing is stored as a
file on the server.

---

## Current setup

| Piece | Where |
|---|---|
| Site | `e-management-portal.netlify.app` |
| Repository | `ismailmansur02-hash/amarah`, branch `claude/property-management-portal-fnl0a9` |
| App folder | `property-portal/` (the root `netlify.toml` points Netlify at it) |
| Database | Supabase project `uqekeszdgeumwjdbompd` (eu-west-1) |
| Documents | Netlify Blobs, store `property-documents` |

Deploys are automatic: the production branch is set to the branch above, so
**every push to it builds and publishes**. Nothing needs to be run by hand.

To deploy without pushing: **Deploys → Trigger deploy → Deploy site**.

---

## Environment variables

Set on the Netlify site (Site configuration → Environment variables). All five
are already configured.

| Variable | What it does |
|---|---|
| `DATABASE_URL` | Supabase connection string, using the `portal_app` role. |
| `SESSION_SECRET` | Signs login cookies. The app **refuses to authenticate without it** rather than falling back to a development key. |
| `INITIAL_MANAGER_PASSWORD` | Password for the first manager account, created on the first login attempt against an empty database. |
| `INITIAL_MANAGER_USERNAME` | Defaults to `manager`. |
| `INITIAL_MANAGER_NAME` | Display name. |

If the site reports a database error, the host in `DATABASE_URL` is the thing to
check. Supabase dashboard → **Connect** → copy the **Transaction pooler** string,
then substitute the `portal_app` user and its password.

---

## The database

The schema lives in [`db/schema.sql`](db/schema.sql) and is applied to Supabase as
the migration `property_portal_initial_schema`. Ten tables: `portal_users`,
`properties`, `documents`, `checklist_steps`, `renovation_tasks`, `tenants`,
`leases`, `ledger_entries`, `maintenance_requests`, `activity_log`.

**Why every table has RLS enabled with no policies.** Supabase serves every table
in the `public` schema through PostgREST using the publishable API key — a key
designed to be embedded in public web pages. Left at defaults, anyone holding it
could read every client's rent, payouts, tenant details, and legal documents.
Row-level security with no policies denies that path completely, and privileges
are revoked from `anon` and `authenticated` as well.

The app connects as **`portal_app`**, a dedicated role that owns the tables and
therefore bypasses RLS. It is deliberately not the `postgres` superuser.

To change the schema, add a new migration in Supabase and update `db/schema.sql`
to match. Never edit a migration that has already been applied.

---

## First run

1. Open the site and sign in with `INITIAL_MANAGER_USERNAME` / `INITIAL_MANAGER_PASSWORD`.
2. Go to **Account** (your name, top right) and change your password immediately.
3. **Create a client login** for each owner — you choose their username and password.
4. **Add each property**, assigning it to its owner. The 14-step rent-ready legal
   checklist is created automatically.
5. Send each client the site address and their login, and point them at
   `/install` to put the app on their phone.

A fresh database contains **only the manager account** — no demo clients, no
sample properties.

---

## Giving the app to clients

Clients do not go to an app store. They open the site and install it:

- **iPhone/iPad:** Safari → Share → **Add to Home Screen**
- **Android:** Chrome → tap **Install** when prompted
- **Computer:** Chrome or Edge → install icon in the address bar

It then behaves like any other app: icon on the home screen, full screen, no
browser bars. The `/install` page walks them through it per device.

Because property data is private, the app caches **no** pages or records on the
device — only its icons and an offline notice. Signing out clears even that,
which matters on a shared phone.

---

## Backups

Supabase takes managed backups. For an independent copy you control — worth
having, since it survives an account problem and not just a server one:

```bash
pg_dump "<your Supabase connection string>" > portal-backup-$(date +%F).sql
```

Keep those somewhere else entirely. Uploaded documents live in Netlify Blobs and
are **not** part of a `pg_dump`; the database rows reference them by key.

---

## Local development

```bash
cd property-portal
npm install

# Any Postgres will do — apply the schema, then point the app at it.
psql "$DATABASE_URL" -f db/schema.sql

DATABASE_URL=postgres://… SESSION_SECRET=dev-secret \
  INITIAL_MANAGER_PASSWORD=devpassword npm run dev
```

Off Netlify, uploaded documents fall back to `data/uploads/` on disk so the app
runs without the Netlify environment.

---

## Troubleshooting a deploy

- **Build finishes in seconds and says "no functions deployed"** — it built the
  wrong branch, or the root `netlify.toml` is missing. That file sets
  `base = "property-portal"`; the build settings in the UI should be left blank.
- **Site loads but every page errors** — check `DATABASE_URL`, above.
- **Login says the session secret is missing** — `SESSION_SECRET` is not set. This
  is deliberate: the app will not sign anyone in with a guessable key.
