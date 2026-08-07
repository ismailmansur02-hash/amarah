import { NextRequest, NextResponse } from "next/server";
import { sql, one } from "@/lib/db";
import { getDocument } from "@/lib/blobs";
import { requireApiSession, isResponse, jsonError } from "@/lib/api";
import { getPropertyForSession } from "@/lib/access";

/** Download a stored document; access limited to the property's owner and managers. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;

  const { id } = await ctx.params;
  const docId = Number(id);
  if (!Number.isInteger(docId)) return jsonError("Invalid document id", 400);

  const doc = await one<{
    id: number;
    property_id: number;
    blob_key: string | null;
    original_name: string | null;
    title: string;
    content_type: string;
  }>(sql`SELECT id, property_id, blob_key, original_name, title, content_type
         FROM documents WHERE id = ${docId}`);

  // The access check is the point of this route: a client may only download
  // documents belonging to a property they own.
  if (!doc || !(await getPropertyForSession(doc.property_id, session))) {
    return jsonError("Document not found", 404);
  }
  if (!doc.blob_key) return jsonError("No file attached to this document", 404);

  const data = await getDocument(doc.blob_key);
  if (!data) return jsonError("File missing from storage", 404);

  const filename = (doc.original_name || doc.title || "document").replace(/[^\w.\- ]/g, "_");
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.content_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
