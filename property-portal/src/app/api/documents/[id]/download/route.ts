import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db";
import { requireApiSession, isResponse, jsonError } from "@/lib/api";
import { getPropertyForSession } from "@/lib/access";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

/** Download a stored document file; access limited to the property's owner and managers. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;

  const { id } = await ctx.params;
  const docId = Number(id);
  if (!Number.isInteger(docId)) return jsonError("Invalid document id", 400);

  const doc = db
    .prepare("SELECT id, property_id, file_path, original_name, title FROM documents WHERE id = ?")
    .get(docId) as
    | { id: number; property_id: number; file_path: string | null; original_name: string | null; title: string }
    | undefined;
  if (!doc || !getPropertyForSession(doc.property_id, session)) {
    return jsonError("Document not found", 404);
  }
  if (!doc.file_path) return jsonError("No file attached to this document", 404);

  const resolved = path.resolve(UPLOAD_DIR, doc.file_path);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR) + path.sep) || !fs.existsSync(resolved)) {
    return jsonError("File missing from storage", 404);
  }

  const data = fs.readFileSync(resolved);
  const filename = (doc.original_name || doc.title || "document").replace(/[^\w.\- ]/g, "_");
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
