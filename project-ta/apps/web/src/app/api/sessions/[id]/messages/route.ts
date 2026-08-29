import { filterMessage, newId, type Message } from "@project-ta/shared";
import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { addMessage, getMessages, getSession } from "@/lib/store";

export const dynamic = "force-dynamic";

async function guard(id: string) {
  const user = await currentUser();
  if (!user) return { error: fail("Sign in first", 401) } as const;
  const session = await getSession(id);
  if (!session) return { error: fail("Session not found", 404) } as const;
  if (session.studentId !== user.id && session.tutorId !== user.id) {
    return { error: fail("You aren't part of that session", 403) } as const;
  }
  return { user, session } as const;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await guard(id);
  if ("error" in g) return g.error;

  const since = Number(new URL(req.url).searchParams.get("since") ?? 0);
  const all = await getMessages(id);
  return ok({
    messages: since ? all.filter((m) => m.createdAt > since) : all,
    serverTime: Date.now(),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await guard(id);
  if ("error" in g) return g.error;
  const { user, session } = g;

  if (session.status !== "active") return fail("This session has ended", 409);

  const { body } = (await req.json()) as { body?: string };
  const raw = (body ?? "").trim();
  if (!raw) return fail("Nothing to send");
  if (raw.length > 2000) return fail("That message is too long");

  // Safeguarding filter runs server-side so it cannot be bypassed by the client.
  const filtered = filterMessage(raw);

  const message: Message = {
    id: newId("msg"),
    sessionId: id,
    senderId: user.id,
    senderRole: user.role,
    senderName: user.displayName,
    kind: "text",
    body: filtered.clean,
    createdAt: Date.now(),
    redacted: filtered.redacted,
  };

  await addMessage(message);
  return ok({ message });
}
