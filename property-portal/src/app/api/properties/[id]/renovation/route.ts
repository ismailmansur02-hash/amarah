import { NextRequest, NextResponse } from "next/server";
import { sql, one, logActivity } from "@/lib/db";
import { requireApiSession, isResponse, resolveProperty, jsonError, str, num } from "@/lib/api";

/** Manager adds a renovation task or updates a task's status / actual cost. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (isResponse(session)) return session;
  if (session.role !== "manager") return jsonError("Managers only", 403);

  const { id } = await ctx.params;
  const property = await resolveProperty(id, session);
  if (isResponse(property)) return property;

  const form = await req.formData();
  const taskId = num(form, "task_id");

  if (taskId !== null) {
    const task = await one<{ id: number; title: string; status: string }>(
      sql`SELECT id, title, status FROM renovation_tasks
          WHERE id = ${taskId} AND property_id = ${property.id}`
    );
    if (!task) return jsonError("Task not found", 404);

    const status = str(form, "status");
    if (!["pending", "in_progress", "done"].includes(status)) return jsonError("Invalid status");
    const costActual = num(form, "cost_actual");

    await sql`UPDATE renovation_tasks
              SET status = ${status},
                  cost_actual = COALESCE(${costActual}::numeric, cost_actual),
                  completed_at = ${status === "done" ? new Date().toISOString() : null}::timestamptz
              WHERE id = ${task.id}`;
    if (status === "done" && task.status !== "done") {
      await logActivity(property.id, session.uid, "Renovation task completed", task.title);
    }
    return NextResponse.json({ ok: true });
  }

  const title = str(form, "title");
  if (!title) return jsonError("Task title is required");
  await sql`INSERT INTO renovation_tasks (property_id, title, description, cost_estimate)
            VALUES (${property.id}, ${title}, ${str(form, "description")},
                    ${num(form, "cost_estimate")}::numeric)`;
  await logActivity(property.id, session.uid, "Renovation task added", title);
  return NextResponse.json({ ok: true });
}
