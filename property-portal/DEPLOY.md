# Putting E, Management on Netlify

The app runs on Netlify as serverless functions. Two things follow from that,
and they shape the whole setup:

- **There is no persistent filesystem.** Netlify functions get a throwaway disk.
  So the records live in **Netlify DB** (Postgres) and the uploaded documents live
  in **Netlify Blobs** — never in a file on the server.
- **Both are provisioned automatically.** Installing `@netlify/database` and
  deploying creates the Postgres database and wires up its connection string. There
  is no database to create by hand and no connection string to copy.

---

## Deploy

From inside the `property-portal/` folder:

```bash
npm install -g netlify-cli
netlify login

# Creates the site and links this folder to it.
netlify init

# The one secret you must set. Without it the app refuses to log anyone in,
# rather than falling back to a public development key.
netlify env:set SESSION_SECRET "$(openssl rand -base64 32)" --secret

# Used only to create the very first manager login, on the first sign-in
# attempt against the empty database.
netlify env:set INITIAL_MANAGER_USERNAME "yourname"
netlify env:set INITIAL_MANAGER_PASSWORD "a-long-strong-password" --secret
netlify env:set INITIAL_MANAGER_NAME "Your Name"

netlify deploy --build --prod
```

HTTPS and the certificate are automatic. You need HTTPS anyway — both for login
security and because phones will not install the app over plain HTTP.

### Your own domain

In the Netlify dashboard: **Domain management → Add a domain**, then follow the DNS
instructions. The certificate is issued automatically.

---

## First run

1. Open the site and sign in with the manager username and password you set.
2. Go to **Account** (your name, top right) and change your password.
3. On the dashboard, **create a client login** for each owner — you pick their
   username and password.
4. **Add each property**, assigning it to its owner. The 14-step rent-ready legal
   checklist is created automatically.
5. Send each client the site address and their login, and point them at
   `https://your-site/install` to put the app on their phone.

A fresh database contains **only your manager account** — no demo clients, no sample
properties.

---

## Giving the app to clients

Clients do not go to an app store. They open the site and install it:

- **iPhone/iPad:** open in Safari → Share → **Add to Home Screen**
- **Android:** open in Chrome → tap **Install** when prompted
- **Computer:** Chrome or Edge → install icon in the address bar

It then behaves like any other app: icon on the home screen, opens full screen, no
browser bars. The `/install` page walks them through it for their device.

Because property data is private, the app caches **no** pages or records on the
device — only its icons and an offline notice. Signing out clears even that, which
matters on a shared phone.

---

## Database changes

The schema lives in `netlify/database/migrations/`. Each migration is a folder named
`<number>_<slug>` containing `migration.sql`. Netlify applies any new ones
automatically, immediately before a deploy goes live; if a migration fails, the
deploy does not publish.

To change the schema, add a new migration folder — never edit one that has already
been deployed.

Deploy previews get their **own isolated copy** of the database, so testing a branch
can never touch real client records.

---

## Backups

Netlify DB is Postgres with automated backups and point-in-time restore, managed for
you — that is the main reason this setup is safer than the app owning a file on a
disk somewhere.

For an independent copy you control (worth having — it survives an account problem,
not just a server problem):

```bash
# Print the connection string, then dump with standard Postgres tooling.
netlify env:get NETLIFY_DATABASE_URL
pg_dump "<that-connection-string>" > portal-backup-$(date +%F).sql
```

Keep those dumps somewhere else entirely. Uploaded documents live in Netlify Blobs
and are not part of a `pg_dump`; the database rows reference them by key.

---

## Updating the app later

```bash
git pull
netlify deploy --build --prod
```

Or connect the GitHub repository in the Netlify dashboard and every push to the
chosen branch deploys itself.

---

## Environment variables

| Variable | Required | What it does |
|---|---|---|
| `SESSION_SECRET` | **Yes** | Signs login cookies. The app refuses to authenticate without it. Generate with `openssl rand -base64 32`. |
| `INITIAL_MANAGER_PASSWORD` | On first run | Password for the first manager account, created on the first login attempt against an empty database. |
| `INITIAL_MANAGER_USERNAME` | No | Defaults to `manager`. |
| `INITIAL_MANAGER_NAME` | No | Display name. Defaults to "Property Manager". |
| `NETLIFY_DATABASE_URL` | Automatic | Set by Netlify DB. Do not set by hand. |

---

## Local development

Netlify's own primitives (database, blobs) need the Netlify CLI:

```bash
netlify dev
```

To run against a plain local Postgres instead, set `DATABASE_URL` and apply the
migration by hand:

```bash
psql "$DATABASE_URL" -f netlify/database/migrations/001_initial-schema/migration.sql
DATABASE_URL=postgres://... SESSION_SECRET=dev INITIAL_MANAGER_PASSWORD=devpassword npm run dev
```

Off Netlify, uploaded documents fall back to `data/uploads/` on disk so the app runs
without the Netlify environment.
