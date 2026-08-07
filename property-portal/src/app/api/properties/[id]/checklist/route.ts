import { NextRequest, NextResponse } from "next/server";
import { sql, one, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str, num } from "@/lib/api";

/** Manager toggles a rent-ready step or adds a custom step. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = await resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();
  const stepId = num(form, "step_id");

  if (stepId !== null) {
    const step = await one<{ id: number; title: string }>(
      sql`SELECT id, title FROM checklist_steps WHERE id = ${stepId} AND property_id = ${property.id}`
    );
    if (!step) return jsonError("Step not found", 404);

    const completed = str(form, "completed") === "1";
    await sql`UPDATE checklist_steps
              SET completed = ${completed},
                  completed_at = ${completed ? new Date().toISOString() : null}::timestamptz
              WHERE id = ${step.id}`;
    if (completed) {
      await logActivity(property.id, session.uid, "Rent-ready step completed", step.title);
    }
    return NextResponse.json({ ok: true });
  }

  const title = str(form, "title");
  if (!title) return jsonError("Step title is required");

  const max = await one<{ p: number }>(
    sql`SELECT COALESCE(MAX(position), 0) AS p FROM checklist_steps WHERE property_id = ${property.id}`
  );
  await sql`INSERT INTO checklist_steps (property_id, position, title, description)
            VALUES (${property.id}, ${(max?.p ?? 0) + 1}, ${title}, ${str(form, "description")})`;
  await logActivity(property.id, session.uid, "Rent-ready step added", title);
  return NextResponse.json({ ok: true });
}
