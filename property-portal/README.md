# E, Management — Property Portal

A property management portal where **every property is a file**, and inside that file
are the six sub-files the business runs on. Property managers see everything; each
client signs in with a pre-made login and sees **only their own properties**.

Built as a web app that clients can **install on their phone like a normal app** — no
app store required.

---

## The property file

Every property opens as a tabbed file. The tabs are numbered in the order the
business works through them:

| # | File | What lives in it |
|---|------|------------------|
| — | **Overview** | Next owner payment, management fee, tax deductions YTD, open requests, both progress bars, and the running activity checklist since takeover |
| 1 | **Property Info** | Address, owner, takeover date, fee terms — plus deed, insurance, tax records |
| 2 | **Legal** | The rent-ready legal process as a step-by-step checklist, plus licences, permits, disclosures |
| 3 | **Renovation** | Written scope of work, task list with estimated vs actual cost, and a completion bar |
| 4 | **Tenants & Lease** | Tenant contacts, lease terms (rent, deposit, due day, dates), signed lease and move-in report |
| 5 | **Accounting & Tax** | Month-by-month ledger — rent, expenses, management fee, tax-deductible amount, owner payout, payout date and status. Exports to CSV for Excel |
| 6 | **Maintenance** | Maintenance and management requests, with priority and status. Clients can submit their own |

### The rent-ready legal checklist

Every new property is automatically seeded with a 14-step legal process to take a
property from takeover to rent ready, defined in
[`src/lib/rentReadyTemplate.ts`](src/lib/rentReadyTemplate.ts):

1. Verify deed and clear title
2. Confirm zoning and rental eligibility
3. Register rental / obtain rental licence
4. Place landlord insurance in force
5. Confirm property taxes are current
6. Pass habitability / code inspection
7. Install and certify smoke & CO detectors
8. Prepare lead-based paint disclosure
9. Obtain certificate of occupancy / rental permit
10. Complete repairs & renovation to code
11. Set up security deposit account
12. Draft state-compliant lease agreement
13. Transfer and verify utilities
14. Final walkthrough & condition report

The manager ticks these off one at a time; the progress bar and the client's view
update as they go. Steps can be added per property, since requirements vary by city
and state.

> These steps are a practical operating checklist, not legal advice. Confirm the exact
> requirements for each jurisdiction you operate in.

### Activity checklist

Every meaningful action — a step completed, a lease signed, a payout sent, a document
filed, a status change — is written to a per-property activity log, giving the
"everything accomplished from takeover date to today" timeline that clients can read.

---

## Who sees what

| | Manager | Client |
|---|---|---|
| All properties, all clients | ✅ | ❌ |
| Their own properties | ✅ | ✅ |
| Another client's property | ✅ | **Never** — returns 404 |
| Create client logins / properties | ✅ | ❌ |
| Tick checklist steps, edit ledger, file documents | ✅ | ❌ |
| Submit maintenance requests | ✅ | ✅ (own property only) |
| Export the ledger to CSV | ✅ | ✅ (own property only) |

Access is enforced server-side on every page and every API route through
`getPropertyForSession()` in [`src/lib/access.ts`](src/lib/access.ts) — a client asking
for a property that isn't theirs gets a 404, whether they ask via the UI or by calling
the API directly. Document downloads run the same check before serving a file.

---

## Installing as an app

The portal is a **Progressive Web App**. Clients open the site, install it, and get an
app icon on their home screen that opens full-screen with no browser chrome.

- An install banner appears automatically on supported devices.
- `/install` is a public page with step-by-step instructions per device — send clients
  straight to this link.
- **iPhone/iPad:** Safari → Share → Add to Home Screen.
- **Android/Chrome, desktop Chrome/Edge:** one-tap Install button.

Property data is private, so the service worker
([`public/sw.js`](public/sw.js)) deliberately caches **only** static assets and an
offline notice — never pages or API responses. Signing out clears its caches, so a
shared device keeps nothing behind. Offline, the app shows a clear "you're offline"
screen rather than stale financial data.

> A PWA covers "download the app" without app store review, fees, or developer
> accounts. If the business later wants a true App Store / Play Store listing, this
> same codebase can be wrapped with Capacitor — but that adds store accounts,
> review cycles, and release management.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Development seeds a demo dataset: two clients, two properties (one fully rent-ready
and occupied, one mid-renovation), documents, leases, ledger months, and activity.

**Demo logins (development only):**

| Role | Username | Password |
|---|---|---|
| Manager | `manager` | `manager123` |
| Client — John Smith | `jsmith` | `client123` |
| Client — Ana Garcia | `agarcia` | `client123` |

### Production

```bash
export SESSION_SECRET="$(openssl rand -base64 32)"   # required
export INITIAL_MANAGER_USERNAME="yourname"           # optional, defaults to 'manager'
export INITIAL_MANAGER_PASSWORD="a-strong-password"  # optional but strongly advised
npm run build
npm run start
```

In production the app **refuses to authenticate without `SESSION_SECRET`** — otherwise
session cookies would be signed with a public development key and anyone could forge a
login. It also seeds **only** the manager account: no demo clients, no demo properties,
no published demo passwords. Set `SEED_DEMO_DATA=1` if you do want the sample data.

Sign in as the manager, then create client logins from the dashboard and hand each
client their username and password.

### Before going live

- Serve over **HTTPS** — required both for session cookie security and for the app to
  be installable.
- Change the initial manager password if you did not set it via environment variable.
- Back up `data/portal.db` and `data/uploads/` — they hold every record and document.

---

## How it is built

- **Next.js 15** (App Router, React 19, server components) + **Tailwind CSS 4**
- **SQLite** via `better-sqlite3` — the whole dataset is one file, `data/portal.db`
- **Sessions:** signed JWT in an httpOnly cookie (`jose`), passwords hashed with bcrypt
- **Uploads:** stored under `data/uploads/<propertyId>/`, served only through an
  access-checked route with path-traversal protection

```
src/
  app/
    dashboard/          manager dashboard — all properties, payouts, client logins
    my/                 client home — their properties, next payment, tax YTD
    property/[id]/      the property file
      sections/         the six tabs
    install/            public install guide for clients
    api/                mutation + export endpoints, all access-checked
  components/           forms, toggles, progress bar, install prompt
  lib/
    db.ts               schema, migrations, seed
    access.ts           who-can-see-what enforcement
    auth.ts             session signing / verification
    rentReadyTemplate.ts  the 14 legal steps
  middleware.ts         redirects unauthenticated traffic to /login
public/
  manifest.webmanifest, sw.js, offline.html, icons/
```

### Things worth knowing before extending it

- **The database is a single file.** Fine for one manager and dozens of properties.
  If this grows to multiple concurrent managers or gets deployed to a serverless
  platform with an ephemeral filesystem, move to Postgres — `src/lib/db.ts` is the
  only file with SQL in it.
- **Uploads are on local disk.** Same constraint: move to object storage (S3, R2) if
  the host's filesystem isn't persistent.
- **Money is stored as numbers, not integer cents.** Fine at these amounts; if exact
  accounting matters, switch to integer cents.
