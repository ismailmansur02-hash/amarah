import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { db, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str } from "@/lib/api";

const SECTIONS = ["property", "legal", "renovation", "lease", "accounting", "maintenance"];
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Manager files a document (metadata plus optional uploaded file) into a section. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();
  const section = str(form, "section");
  const title = str(form, "title");
  if (!SECTIONS.includes(section)) return jsonError("Invalid section");
  if (!title) return jsonError("Document title is required");

  let filePath: string | null = null;
  let originalName: string | null = null;
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return jsonError("File too large (25 MB max)");
    const dir = path.join(UPLOAD_DIR, String(property.id));
    fs.mkdirSync(dir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "document";
    const stored = `${crypto.randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, stored), buffer);
    filePath = path.join(String(property.id), stored);
    originalName = file.name;
  }

  db.prepare(
    `INSERT INTO documents (property_id, section, title, doc_type, notes, file_path, original_name)
     VALUES (?,?,?,?,?,?,?)`
  ).run(property.id, section, title, str(form, "doc_type"), str(form, "notes"), filePath, originalName);
  logActivity(property.id, session.uid, "Document filed", `${title} (${section})`);
  return NextResponse.json({ ok: true });
}
