import { NextRequest, NextResponse } from "next/server";
import { db, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str, num } from "@/lib/api";

/** Manager adds a renovation task or updates a task's status / actual cost. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();
  const taskId = num(form, "task_id");

  if (taskId !== null) {
    const task = db
      .prepare("SELECT id, title, status FROM renovation_tasks WHERE id = ? AND property_id = ?")
      .get(taskId, property.id) as { id: number; title: string; status: string } | undefined;
    if (!task) return jsonError("Task not found", 404);

    const status = str(form, "status");
    if (!["pending", "in_progress", "done"].includes(status)) return jsonError("Invalid status");
    const costActual = num(form, "cost_actual");

    db.prepare(
      "UPDATE renovation_tasks SET status = ?, cost_actual = COALESCE(?, cost_actual), completed_at = ? WHERE id = ?"
    ).run(
      status,
      costActual,
      status === "done" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
      task.id
    );
    if (status === "done" && task.status !== "done") {
      logActivity(property.id, session.uid, "Renovation task completed", task.title);
    }
    return NextResponse.json({ ok: true });
  }

  const title = str(form, "title");
  if (!title) return jsonError("Task title is required");
  db.prepare(
    "INSERT INTO renovation_tasks (property_id, title, description, cost_estimate) VALUES (?,?,?,?)"
  ).run(property.id, title, str(form, "description"), num(form, "cost_estimate"));
  logActivity(property.id, session.uid, "Renovation task added", title);
  return NextResponse.json({ ok: true });
}
