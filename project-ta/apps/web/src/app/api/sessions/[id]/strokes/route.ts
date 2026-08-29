import { newId, type Stroke } from "@project-ta/shared";
import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { addStrokes, clearStrokes, getSession, getStrokes } from "@/lib/store";

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
  const all = await getStrokes(id);
  return ok({
    strokes: since ? all.filter((s) => s.createdAt > since) : all,
    total: all.length,
    serverTime: Date.now(),
  });
}

interface IncomingStroke {
  tool: Stroke["tool"];
  color: string;
  width: number;
  points: number[];
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await guard(id);
  if ("error" in g) return g.error;
  const { user } = g;

  const { strokes } = (await req.json()) as { strokes?: IncomingStroke[] };
  if (!Array.isArray(strokes) || !strokes.length) return fail("No strokes sent");

  const now = Date.now();
  const saved: Stroke[] = strokes.slice(0, 40).map((s, i) => ({
    id: newId("str"),
    sessionId: id,
    authorId: user.id,
    authorRole: user.role,
    tool: s.tool === "highlighter" || s.tool === "eraser" ? s.tool : "pen",
    color: typeof s.color === "string" ? s.color.slice(0, 24) : "#0f5132",
    width: Math.min(Math.max(Number(s.width) || 3, 1), 60),
    points: (s.points ?? []).slice(0, 2000).map(Number),
    createdAt: now + i,
  }));

  await addStrokes(id, saved);
  return ok({ saved: saved.length, serverTime: Date.now() });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await guard(id);
  if ("error" in g) return g.error;
  await clearStrokes(id);
  return ok({ cleared: true });
}
