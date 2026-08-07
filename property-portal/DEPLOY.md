# Putting E, Management online

This is the full path from "code in a repo" to "my client opened the app on their
phone." Follow it top to bottom once; after that, updates are a single command.

**The decisions are already made for you.** You need a host with a *persistent disk*,
because the entire business record — every property, ledger row, and uploaded document
— lives in one SQLite file plus an uploads folder. Hosts like Vercel and Netlify have
no persistent disk: the database would be wiped on every deploy. So: Fly.io, below.

---

## What you need before you start

1. A **Fly.io** account (free to create, this app costs roughly $3–5/month).
2. The **flyctl** command-line tool: <https://fly.io/docs/flyctl/install/>
3. A **domain name** (optional — Fly gives you a free `*.fly.dev` address that works).

---

## Deploy (about 10 minutes, once)

From inside the `property-portal/` folder:

```bash
fly auth login

# Creates the app on Fly using the settings already in fly.toml.
# Say NO if it offers to deploy now — secrets and the disk come first.
fly launch --no-deploy --copy-config

# The persistent disk. Everything irreplaceable lives here.
fly volumes create portal_data --size 3

# The two secrets the app needs. Save the manager password somewhere safe —
# it is how you first sign in.
fly secrets set \
  SESSION_SECRET="$(openssl rand -base64 32)" \
  INITIAL_MANAGER_USERNAME="yourname" \
  INITIAL_MANAGER_PASSWORD="pick-a-long-strong-password" \
  INITIAL_MANAGER_NAME="Your Name"

fly deploy
fly open
```

`SESSION_SECRET` is what signs login cookies. The app **refuses to log anyone in**
without it rather than falling back to a public development key, so you cannot
accidentally deploy an app anyone could forge a login for.

HTTPS is automatic and forced (`force_https` in `fly.toml`). You need it — both to keep
logins secure and because phones will not install the app over plain HTTP.

### Your own domain (optional)

```bash
fly certs create portal.yourdomain.com
fly certs show portal.yourdomain.com     # shows the DNS records to add
```

Add the shown records at your domain registrar, wait a few minutes, done.

---

## First run

1. Open the site and sign in with the manager username and password you set above.
2. Go to **Account** (your name, top right) and change your password.
3. On the dashboard, **create a client login** for each owner — you choose their
   username and password.
4. **Add each property**, assigning it to its owner. The 14-step rent-ready legal
   checklist is created automatically.
5. Send each client the site address and their login. Point them at
   `https://your-address/install` for phone install instructions.

A fresh production database contains **only your manager account** — no demo clients,
no sample properties.

---

## Giving the app to clients

Clients do not go to an app store. They open the site and install it:

- **iPhone/iPad:** open in Safari → Share → **Add to Home Screen**
- **Android:** open in Chrome → tap **Install** when prompted
- **Computer:** Chrome or Edge → install icon in the address bar

It then behaves like any other app: icon on the home screen, opens full screen, no
browser bars. The `/install` page walks them through it for whatever device they are
on, and an install banner appears automatically.

Because property data is private, the app caches **no** pages or records on the device
— only its icons and an offline notice. Signing out clears even that, which matters on
a shared phone. Offline, clients see a clear "you're offline" screen instead of stale
figures.

---

## Backups — set this up on day one

The volume is not a backup. If you lose it, you lose everything.

```bash
fly ssh console -C "npm run backup"
```

That writes a timestamped snapshot (database + uploaded documents) to
`data/backups/` and keeps the newest 14. It uses SQLite's online backup API, so it is
safe to run while people are using the app.

**Run it nightly** from any machine that is on — your laptop, a small server — with a
cron entry:

```cron
0 2 * * * cd /path/to/property-portal && fly ssh console -C "npm run backup"
```

**Pull a copy off the server**, so a lost volume is survivable:

```bash
fly ssh sftp get /app/data/backups/<timestamp>/portal.db ./portal-backup.db
```

Keep those copies somewhere else entirely — cloud storage, an external drive.

### Restoring

```bash
fly ssh console
cd /app/data
cp backups/<timestamp>/portal.db portal.db
rm -f portal.db-wal portal.db-shm       # discard any stale write-ahead log
cp -r backups/<timestamp>/uploads .
exit
fly apps restart e-management-portal
```

---

## Updating the app later

```bash
git pull
fly deploy
```

The volume is untouched by deploys, so all data and documents survive.

---

## Alternative: your own server with Docker

If you would rather run it on a VPS you already have:

```bash
cat > .env <<'EOF'
SESSION_SECRET=paste-output-of-openssl-rand-base64-32
INITIAL_MANAGER_USERNAME=yourname
INITIAL_MANAGER_PASSWORD=pick-a-long-strong-password
EOF

docker compose up -d --build
```

Data persists in the `portal-data` Docker volume. Put a reverse proxy with HTTPS
(Caddy or nginx + Let's Encrypt) in front of port 3000 — do not expose it directly,
and do not skip HTTPS. Back up with:

```bash
docker compose exec portal npm run backup
```

---

## Things to know as it grows

- **One machine only.** SQLite is a single file on a single disk and must not be
  written by two servers at once. `fly.toml` pins this to one machine deliberately;
  do not scale it out. This is the right trade for one manager and dozens of
  properties.
- **If you outgrow that** — several managers in different offices working
  simultaneously — move to Postgres. `src/lib/db.ts` is the only file containing SQL,
  and uploads would move to S3-style storage at the same time.
- **Uploaded documents count against the volume.** 3 GB holds a lot of PDFs; raise it
  with `fly volumes extend` if it fills.
