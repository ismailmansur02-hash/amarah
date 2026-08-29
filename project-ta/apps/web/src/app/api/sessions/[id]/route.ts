import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getSession, getUser } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return fail("Sign in first", 401);

  const session = await getSession(id);
  if (!session) return fail("Session not found", 404);
  if (session.studentId !== user.id && session.tutorId !== user.id) {
    return fail("You aren't part of that session", 403);
  }

  const [student, tutor] = await Promise.all([
    getUser(session.studentId),
    getUser(session.tutorId),
  ]);

  return ok({
    session,
    student: student ? { id: student.id, displayName: student.displayName, avatarColor: student.avatarColor, yearGroup: student.yearGroup } : null,
    tutor: tutor ? { id: tutor.id, displayName: tutor.displayName, avatarColor: tutor.avatarColor, university: tutor.university, rating: tutor.rating } : null,
    me: { id: user.id, role: user.role },
    serverTime: Date.now(),
  });
}
