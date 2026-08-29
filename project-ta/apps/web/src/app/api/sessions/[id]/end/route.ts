import { newId, type Message } from "@project-ta/shared";
import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { addMessage, getRequest, getSession, saveRequest, saveSession } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return fail("Sign in first", 401);

  const session = await getSession(id);
  if (!session) return fail("Session not found", 404);
  if (session.studentId !== user.id && session.tutorId !== user.id) {
    return fail("You aren't part of that session", 403);
  }
  if (session.status !== "active") return ok({ session });

  session.status = "completed";
  session.endedAt = Date.now();
  await saveSession(session);

  const request = await getRequest(session.requestId);
  if (request) {
    request.status = "completed";
    await saveRequest(request);
  }

  const note: Message = {
    id: newId("msg"),
    sessionId: id,
    senderId: "system",
    senderRole: "admin",
    senderName: "Project TA",
    kind: "system",
    body: "Session ended. The transcript and whiteboard are saved to your account.",
    createdAt: Date.now(),
  };
  await addMessage(note);

  return ok({ session });
}
