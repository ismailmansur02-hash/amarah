#!/usr/bin/env node
/**
 * Backs up everything the business would be unable to reconstruct: the
 * database and the uploaded documents.
 *
 *   npm run backup
 *
 * Uses SQLite's online backup API, so it is safe to run while the app is
 * serving traffic — no need to stop the server or risk a torn WAL copy.
 * Keeps the most recent BACKUP_KEEP snapshots (default 14) and deletes older
 * ones.
 *
 * Restore: stop the app, copy portal.db and uploads/ from a snapshot folder
 * back into data/, then start the app.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "portal.db");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const BACKUP_ROOT = process.env.BACKUP_DIR || path.join(DATA_DIR, "backups");
const KEEP = Number(process.env.BACKUP_KEEP || 14);

if (!fs.existsSync(DB_PATH)) {
  console.error(`No database at ${DB_PATH} — nothing to back up.`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dest = path.join(BACKUP_ROOT, stamp);
fs.mkdirSync(dest, { recursive: true });

const db = new Database(DB_PATH, { readonly: true });
await db.backup(path.join(dest, "portal.db"));
db.close();

if (fs.existsSync(UPLOADS_DIR)) {
  fs.cpSync(UPLOADS_DIR, path.join(dest, "uploads"), { recursive: true });
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return total;
}
console.log(`Backed up to ${dest} (${(dirSize(dest) / 1024 / 1024).toFixed(2)} MB)`);

// Retention: keep the newest KEEP snapshots, drop the rest.
const snapshots = fs
  .readdirSync(BACKUP_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()
  .reverse();

for (const old of snapshots.slice(KEEP)) {
  fs.rmSync(path.join(BACKUP_ROOT, old), { recursive: true, force: true });
  console.log(`Removed old backup ${old}`);
}
