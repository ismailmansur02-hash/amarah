import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { sql, logActivity } from "@/lib/db";
import { putDocument } from "@/lib/blobs";
import { requireApiSession, isResponse, resolveProperty, jsonError, str } from "@/lib/api";

const SECTIONS = ["property", "legal", "renovation", "lease", "accounting", "maintenance"];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Manager files a document (metadata plus optional uploaded file) into a section. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = await resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();
  const section = str(form, "section");
  const title = str(form, "title");
  if (!SECTIONS.includes(section)) return jsonError("Invalid section");
  if (!title) return jsonError("Document title is required");

  let blobKey: string | null = null;
  let originalName: string | null = null;
  let contentType = "application/octet-stream";

  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return jsonError("File too large (25 MB max)");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "document";
    blobKey = `${property.id}/${crypto.randomUUID()}-${safeName}`;
    originalName = file.name;
    contentType = file.type || contentType;
    await putDocument(blobKey, Buffer.from(await file.arrayBuffer()), contentType);
  }

  await sql`INSERT INTO documents (property_id, section, title, doc_type, notes, blob_key, original_name, content_type)
            VALUES (${property.id}, ${section}, ${title}, ${str(form, "doc_type")},
                    ${str(form, "notes")}, ${blobKey}, ${originalName}, ${contentType})`;
  await logActivity(property.id, session.uid, "Document filed", `${title} (${section})`);
  return NextResponse.json({ ok: true });
}
