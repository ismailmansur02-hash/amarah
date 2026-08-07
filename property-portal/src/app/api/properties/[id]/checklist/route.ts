import { NextRequest, NextResponse } from "next/server";
import { db, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str, num } from "@/lib/api";

/** Manager toggles a rent-ready step or adds a custom step. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();
  const stepId = num(form, "step_id");

  if (stepId !== null) {
    const step = db
      .prepare("SELECT id, title, completed FROM checklist_steps WHERE id = ? AND property_id = ?")
      .get(stepId, property.id) as { id: number; title: string; completed: number } | undefined;
    if (!step) return jsonError("Step not found", 404);

    const completed = str(form, "completed") === "1";
    db.prepare(
      "UPDATE checklist_steps SET completed = ?, completed_at = ? WHERE id = ?"
    ).run(completed ? 1 : 0, completed ? new Date().toISOString().slice(0, 19).replace("T", " ") : null, step.id);
    if (completed) {
      logActivity(property.id, session.uid, "Rent-ready step completed", step.title);
    }
    return NextResponse.json({ ok: true });
  }

  const title = str(form, "title");
  if (!title) return jsonError("Step title is required");
  const max = db
    .prepare("SELECT COALESCE(MAX(position), 0) AS p FROM checklist_steps WHERE property_id = ?")
    .get(property.id) as { p: number };
  db.prepare(
    "INSERT INTO checklist_steps (property_id, position, title, description) VALUES (?,?,?,?)"
  ).run(property.id, max.p + 1, title, str(form, "description"));
  logActivity(property.id, session.uid, "Rent-ready step added", title);
  return NextResponse.json({ ok: true });
}
