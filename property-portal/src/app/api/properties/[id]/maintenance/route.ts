import { NextRequest, NextResponse } from "next/server";
import { sql, one, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str, num } from "@/lib/api";

/**
 * Create a maintenance/management request (manager, or the client who owns
 * the property), or update a request's status (manager only).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;

  const { id } = await ctx.params;
  const property = await resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();
  const requestId = num(form, "request_id");

  if (requestId !== null) {
    if (session.role !== "manager") return jsonError("Managers only", 403);

    const request = await one<{ id: number; title: string; status: string }>(
      sql`SELECT id, title, status FROM maintenance_requests
          WHERE id = ${requestId} AND property_id = ${property.id}`
    );
    if (!request) return jsonError("Request not found", 404);

    const status = str(form, "status");
    if (!["open", "in_progress", "resolved"].includes(status)) return jsonError("Invalid status");
    const cost = num(form, "cost");

    await sql`UPDATE maintenance_requests
              SET status = ${status},
                  cost = COALESCE(${cost}::numeric, cost),
                  resolved_at = ${status === "resolved" ? new Date().toISOString() : null}::timestamptz
              WHERE id = ${request.id}`;
    if (status === "resolved" && request.status !== "resolved") {
      await logActivity(property.id, session.uid, "Maintenance resolved", request.title);
    }
    return NextResponse.json({ ok: true });
  }

  const title = str(form, "title");
  if (!title) return jsonError("A title is required");
  const category = str(form, "category") === "management" ? "management" : "maintenance";
  const priority = ["low", "normal", "high", "urgent"].includes(str(form, "priority"))
    ? str(form, "priority")
    : "normal";

  await sql`INSERT INTO maintenance_requests (property_id, title, description, category, priority, created_by)
            VALUES (${property.id}, ${title}, ${str(form, "description")}, ${category},
                    ${priority}, ${session.uid})`;
  await logActivity(
    property.id,
    session.uid,
    session.role === "client" ? "Owner request submitted" : "Request opened",
    title
  );
  return NextResponse.json({ ok: true });
}
