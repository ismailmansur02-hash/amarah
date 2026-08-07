import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { RENT_READY_TEMPLATE } from "./rentReadyTemplate";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

declare global {
  // eslint-disable-next-line no-var
  var __portalDb: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (!global.__portalDb) {
    const conn = new Database(path.join(DATA_DIR, "portal.db"));
    conn.pragma("journal_mode = WAL");
    conn.pragma("busy_timeout = 5000");
    conn.pragma("foreign_keys = ON");
    // Register the connection before migrate/seed run: the seed helpers go
    // through the exported proxy, and must land on this same connection
    // rather than re-entrantly opening a second one against our own lock.
    global.__portalDb = conn;
    try {
      migrate(conn);
      conn.transaction(() => seed(conn))();
    } catch (err) {
      // Another process may seed concurrently on first boot; the UNIQUE
      // username constraint makes the losing seed a harmless no-op.
      if (!(err instanceof Error && /UNIQUE|SQLITE_BUSY/.test(err.message))) {
        global.__portalDb = undefined;
        conn.close();
        throw err;
      }
    }
  }
  return global.__portalDb;
}

// Lazy proxy: the database file is only opened/seeded on first real use,
// never at module import time (Next.js imports route modules in parallel
// workers during build, which must not race on the database).
export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

function migrate(db: Database.Database) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('manager','client')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    zip TEXT NOT NULL DEFAULT '',
    takeover_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'onboarding'
      CHECK (status IN ('onboarding','rent_ready_prep','renovation','listed','occupied')),
    management_fee_type TEXT NOT NULL DEFAULT 'percent' CHECK (management_fee_type IN ('percent','flat')),
    management_fee_value REAL NOT NULL DEFAULT 8,
    renovation_scope TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    section TEXT NOT NULL CHECK (section IN ('property','legal','renovation','lease','accounting','maintenance')),
    title TEXT NOT NULL,
    doc_type TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    file_path TEXT,
    original_name TEXT,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS checklist_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    position INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS renovation_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cost_estimate REAL,
    cost_actual REAL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS leases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    monthly_rent REAL NOT NULL,
    deposit REAL NOT NULL DEFAULT 0,
    due_day INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','ended')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    month TEXT NOT NULL,
    rent_collected REAL NOT NULL DEFAULT 0,
    other_income REAL NOT NULL DEFAULT 0,
    expenses REAL NOT NULL DEFAULT 0,
    expense_notes TEXT NOT NULL DEFAULT '',
    management_fee REAL NOT NULL DEFAULT 0,
    tax_deductible REAL NOT NULL DEFAULT 0,
    tax_notes TEXT NOT NULL DEFAULT '',
    owner_payout REAL NOT NULL DEFAULT 0,
    payout_date TEXT,
    payout_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (payout_status IN ('scheduled','paid')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (property_id, month)
  );
  CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'maintenance' CHECK (category IN ('maintenance','management')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
    cost REAL,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL REFERENCES properties(id),
    actor_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `);
}

export function logActivity(
  propertyId: number,
  actorId: number | null,
  action: string,
  detail = "",
  when?: string
) {
  if (when) {
    db.prepare(
      "INSERT INTO activity_log (property_id, actor_id, action, detail, created_at) VALUES (?,?,?,?,?)"
    ).run(propertyId, actorId, action, detail, when);
  } else {
    db.prepare(
      "INSERT INTO activity_log (property_id, actor_id, action, detail) VALUES (?,?,?,?)"
    ).run(propertyId, actorId, action, detail);
  }
}

export function createChecklistFromTemplate(propertyId: number) {
  const insert = db.prepare(
    "INSERT INTO checklist_steps (property_id, position, title, description) VALUES (?,?,?,?)"
  );
  RENT_READY_TEMPLATE.forEach((step, i) => {
    insert.run(propertyId, i + 1, step.title, step.description);
  });
}

/* ------------------------------------------------------------------ */
/* First-run seed. Always creates the manager login (there has to be   */
/* one to sign in with); the sample clients and properties are only    */
/* added outside production, or when SEED_DEMO_DATA=1 is set, so a     */
/* real deployment starts empty instead of shipping fake records and   */
/* published demo passwords.                                           */
/* ------------------------------------------------------------------ */
function seed(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (count.n > 0) return;

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  const insertUser = db.prepare(
    "INSERT INTO users (username, password_hash, name, email, role) VALUES (?,?,?,?,?)"
  );

  const managerUsername = (process.env.INITIAL_MANAGER_USERNAME || "manager").toLowerCase();
  const managerPassword = process.env.INITIAL_MANAGER_PASSWORD || "manager123";
  const managerId = Number(
    insertUser.run(
      managerUsername,
      hash(managerPassword),
      process.env.INITIAL_MANAGER_NAME || "Property Manager",
      process.env.INITIAL_MANAGER_EMAIL || "",
      "manager"
    ).lastInsertRowid
  );

  const seedDemo =
    process.env.SEED_DEMO_DATA === "1" || process.env.NODE_ENV !== "production";
  if (!seedDemo) return;

  const smithId = Number(
    insertUser.run("jsmith", hash("client123"), "John Smith", "jsmith@example.com", "client").lastInsertRowid
  );
  const garciaId = Number(
    insertUser.run("agarcia", hash("client123"), "Ana Garcia", "agarcia@example.com", "client").lastInsertRowid
  );

  /* ---- Property 1: occupied, full history ---- */
  const p1 = Number(
    db.prepare(
      `INSERT INTO properties (client_id, name, address, city, state, zip, takeover_date, status,
        management_fee_type, management_fee_value, renovation_scope, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      smithId, "Maple Avenue Duplex", "128 Maple Avenue", "Springfield", "IL", "62704",
      "2026-02-01", "occupied", "percent", 8,
      "Full refresh before listing: repaint interior, refinish hardwood floors, replace kitchen counters, new bathroom fixtures, landscaping cleanup.",
      "Two-unit duplex, currently renting unit A; unit B used for storage by tenant."
    ).lastInsertRowid
  );

  createChecklistFromTemplate(p1);
  // Mark every step complete with staggered dates (property reached rent-ready).
  const steps1 = db.prepare("SELECT id, position, title FROM checklist_steps WHERE property_id = ? ORDER BY position").all(p1) as
    { id: number; position: number; title: string }[];
  steps1.forEach((s, i) => {
    const when = new Date(Date.UTC(2026, 1, 3 + i * 3, 10)).toISOString().slice(0, 19).replace("T", " ");
    db.prepare("UPDATE checklist_steps SET completed = 1, completed_at = ? WHERE id = ?").run(when, s.id);
    logActivity(p1, managerId, "Rent-ready step completed", s.title, when);
  });

  const renoTasks1: [string, string, number, number][] = [
    ["Repaint interior", "All rooms, neutral palette", 2800, 2650],
    ["Refinish hardwood floors", "Living room + hallway", 1900, 1900],
    ["Replace kitchen counters", "Quartz, both units", 3400, 3520],
    ["New bathroom fixtures", "Vanity, faucet, shower head", 900, 875],
    ["Landscaping cleanup", "Front and back yard", 600, 600],
  ];
  renoTasks1.forEach(([title, desc, est, act], i) => {
    const when = `2026-03-${String(2 + i * 3).padStart(2, "0")} 15:00:00`;
    db.prepare(
      "INSERT INTO renovation_tasks (property_id, title, description, cost_estimate, cost_actual, status, completed_at) VALUES (?,?,?,?,?,?,?)"
    ).run(p1, title, desc, est, act, "done", when);
    logActivity(p1, managerId, "Renovation task completed", title, when);
  });

  db.prepare("INSERT INTO tenants (property_id, name, email, phone, notes) VALUES (?,?,?,?,?)").run(
    p1, "Dana Whitfield", "dana.w@example.com", "(217) 555-0143", "Primary tenant, unit A. Pays by ACH."
  );
  db.prepare(
    "INSERT INTO leases (property_id, start_date, end_date, monthly_rent, deposit, due_day, status, notes) VALUES (?,?,?,?,?,?,?,?)"
  ).run(p1, "2026-04-01", "2027-03-31", 1850, 1850, 1, "active", "12-month lease, renewal option at market rate.");
  logActivity(p1, managerId, "Lease signed", "Dana Whitfield — $1,850/mo, 12 months starting 2026-04-01", "2026-03-28 12:00:00");

  const docs1: [string, string, string, string][] = [
    ["property", "Warranty Deed", "Deed", "Recorded with Sangamon County, book 412 page 88."],
    ["property", "Landlord Insurance Policy", "Insurance", "Policy #HO-4432871, renews 2027-02-01, $1M liability."],
    ["property", "Property Tax Statement 2025", "Tax", "Paid in full 2025-11-02."],
    ["legal", "Rental Registration Certificate", "License", "City of Springfield rental registration, expires 2027-02-15."],
    ["legal", "Certificate of Occupancy", "Certificate", "Issued 2026-03-20 after inspection."],
    ["legal", "Lead Paint Disclosure", "Disclosure", "Signed by tenant at lease signing."],
    ["lease", "Signed Lease Agreement", "Lease", "Executed 2026-03-28, all riders attached."],
    ["lease", "Move-in Condition Report", "Report", "Photos on file, signed by tenant 2026-04-01."],
    ["accounting", "Management Agreement", "Contract", "8% of collected rent, signed at takeover."],
  ];
  docs1.forEach(([section, title, type, notes]) => {
    db.prepare("INSERT INTO documents (property_id, section, title, doc_type, notes) VALUES (?,?,?,?,?)")
      .run(p1, section, title, type, notes);
  });

  const months: [string, number, number, string, number, string, string, string][] = [
    // month, rent, expenses, expense_notes, tax_deductible, tax_notes, payout_date, status
    ["2026-04", 1850, 210, "Lawn care + gutter cleaning", 358, "Management fee + maintenance deductible", "2026-05-05", "paid"],
    ["2026-05", 1850, 0, "", 148, "Management fee deductible", "2026-06-05", "paid"],
    ["2026-06", 1850, 145, "Plumbing call-out (kitchen sink)", 293, "Management fee + repair deductible", "2026-07-05", "paid"],
    ["2026-07", 1850, 0, "", 148, "Management fee deductible", "2026-08-05", "scheduled"],
  ];
  months.forEach(([month, rent, exp, expNotes, taxDed, taxNotes, payoutDate, status]) => {
    const fee = Math.round(rent * 0.08 * 100) / 100;
    const payout = rent - exp - fee;
    db.prepare(
      `INSERT INTO ledger_entries (property_id, month, rent_collected, expenses, expense_notes,
        management_fee, tax_deductible, tax_notes, owner_payout, payout_date, payout_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).run(p1, month, rent, exp, expNotes, fee, taxDed, taxNotes, payout, payoutDate, status);
    if (status === "paid") {
      logActivity(p1, managerId, "Owner payout sent", `${month} statement — payout $${payout.toFixed(2)}`, `${payoutDate} 09:00:00`);
    }
  });

  const m1 = db.prepare(
    `INSERT INTO maintenance_requests (property_id, title, description, category, priority, status, cost, created_by, created_at, resolved_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  m1.run(p1, "Kitchen sink leaking", "Tenant reported slow leak under kitchen sink.", "maintenance", "high", "resolved", 145, managerId, "2026-06-11 08:30:00", "2026-06-12 16:00:00");
  m1.run(p1, "Quarterly inspection", "Routine quarterly walkthrough of both units.", "management", "normal", "open", null, managerId, "2026-07-30 10:00:00", null);
  logActivity(p1, managerId, "Maintenance resolved", "Kitchen sink leak repaired ($145)", "2026-06-12 16:00:00");

  logActivity(p1, managerId, "Property onboarded", "Takeover from owner, management agreement signed", "2026-02-01 09:00:00");
  logActivity(p1, managerId, "Property listed for rent", "Listed at $1,850/mo", "2026-03-21 09:00:00");
  logActivity(p1, managerId, "Property marked occupied", "Tenant moved in 2026-04-01", "2026-04-01 09:00:00");

  /* ---- Property 2: mid-renovation, checklist partially done ---- */
  const p2 = Number(
    db.prepare(
      `INSERT INTO properties (client_id, name, address, city, state, zip, takeover_date, status,
        management_fee_type, management_fee_value, renovation_scope, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      garciaId, "Birch Court Bungalow", "42 Birch Court", "Springfield", "IL", "62702",
      "2026-06-15", "renovation", "percent", 10,
      "Bring the property to rent-ready: new roof over back porch, replace water heater, full interior paint, update electrical panel, new flooring in kitchen.",
      "Inherited property, vacant for two years before takeover."
    ).lastInsertRowid
  );

  createChecklistFromTemplate(p2);
  const steps2 = db.prepare("SELECT id, position, title FROM checklist_steps WHERE property_id = ? ORDER BY position LIMIT 5").all(p2) as
    { id: number; position: number; title: string }[];
  steps2.forEach((s, i) => {
    const when = new Date(Date.UTC(2026, 5, 18 + i * 3, 11)).toISOString().slice(0, 19).replace("T", " ");
    db.prepare("UPDATE checklist_steps SET completed = 1, completed_at = ? WHERE id = ?").run(when, s.id);
    logActivity(p2, managerId, "Rent-ready step completed", s.title, when);
  });

  const renoTasks2: [string, string, number, number | null, string, string | null][] = [
    ["Replace water heater", "40-gal gas unit", 1400, 1350, "done", "2026-07-02 14:00:00"],
    ["Update electrical panel", "Upgrade to 200A service", 2600, null, "in_progress", null],
    ["Repair back porch roof", "Re-shingle and flash", 1800, null, "in_progress", null],
    ["Full interior paint", "Walls, trim, ceilings", 3100, null, "pending", null],
    ["Kitchen flooring", "Luxury vinyl plank", 1600, null, "pending", null],
  ];
  renoTasks2.forEach(([title, desc, est, act, status, done]) => {
    db.prepare(
      "INSERT INTO renovation_tasks (property_id, title, description, cost_estimate, cost_actual, status, completed_at) VALUES (?,?,?,?,?,?,?)"
    ).run(p2, title, desc, est, act, status, done);
    if (status === "done" && done) logActivity(p2, managerId, "Renovation task completed", title, done);
  });

  db.prepare("INSERT INTO documents (property_id, section, title, doc_type, notes) VALUES (?,?,?,?,?)")
    .run(p2, "property", "Quitclaim Deed", "Deed", "Transferred via estate, recorded 2026-05-30.");
  db.prepare("INSERT INTO documents (property_id, section, title, doc_type, notes) VALUES (?,?,?,?,?)")
    .run(p2, "property", "Vacant Property Insurance", "Insurance", "Builder's risk policy during renovation.");
  db.prepare("INSERT INTO documents (property_id, section, title, doc_type, notes) VALUES (?,?,?,?,?)")
    .run(p2, "renovation", "Contractor Bid — GC Services LLC", "Bid", "Accepted bid for porch roof + electrical.");

  logActivity(p2, managerId, "Property onboarded", "Takeover, keys received, utilities transferred to management", "2026-06-15 09:00:00");
  db.prepare(
    `INSERT INTO maintenance_requests (property_id, title, description, category, priority, status, created_by, created_at)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(p2, "Board up rear window", "Broken pane discovered at takeover walkthrough.", "maintenance", "urgent", "resolved", managerId, "2026-06-16 08:00:00");
}
