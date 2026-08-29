import { isEligible, newId, type Message, type TutorSession } from "@project-ta/shared";
import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { addMessage, getRequest, saveRequest, saveSession } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return fail("Sign in first", 401);
  if (user.role !== "tutor") return fail("Tutor accounts only", 403);

  const request = await getRequest(id);
  if (!request) return fail("That question no longer exists", 404);

  // First-to-accept wins. A second tutor arriving a moment later is told plainly.
  if (request.status !== "pending") return fail("Another tutor got there first", 409);
  if (request.expiresAt <= Date.now()) return fail("That question has expired", 410);
  if (!isEligible(user, request)) return fail("You aren't approved for that subject or level", 403);

  const now = Date.now();
  const session: TutorSession = {
    id: newId("ses"),
    requestId: request.id,
    studentId: request.studentId,
    tutorId: user.id,
    subject: request.subject,
    topic: request.topic,
    startedAt: now,
    endsAt: now + request.durationMins * 60_000,
    extensionsMins: 0,
    status: "active",
    tutorPayoutPence: request.tutorPayoutPence,
  };

  request.status = "active";
  request.matchedTutorId = user.id;
  request.sessionId = session.id;

  await saveSession(session);
  await saveRequest(request);

  const opener: Message = {
    id: newId("msg"),
    sessionId: session.id,
    senderId: "system",
    senderRole: "admin",
    senderName: "Project TA",
    kind: "system",
    body:
      `${user.displayName} has picked up your question. You have ${request.durationMins} minutes. ` +
      `This chat is recorded for safeguarding — contact details can't be shared here.`,
    createdAt: now,
  };
  await addMessage(opener);

  const question: Message = {
    id: newId("msg"),
    sessionId: session.id,
    senderId: request.studentId,
    senderRole: "student",
    senderName: "Question",
    kind: "text",
    body: request.detail,
    createdAt: now + 1,
  };
  await addMessage(question);

  return ok({ session });
}
