import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getSession, getUser, saveSession, saveUser } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Two ratings, deliberately.
 *
 * "understanding" — did they help you understand it, or did they just give you
 * the answer? — is the metric the whole product is built around, because it is
 * the one thing a free AI chatbot cannot be held to.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return fail("Sign in first", 401);

  const session = await getSession(id);
  if (!session) return fail("Session not found", 404);
  if (session.studentId !== user.id) return fail("Only the student rates the session", 403);

  const { rating, understandingRating, feedback } = (await req.json()) as {
    rating?: number;
    understandingRating?: number;
    feedback?: string;
  };

  const stars = Number(rating);
  if (!(stars >= 1 && stars <= 5)) return fail("Give a rating from 1 to 5");

  session.rating = stars;
  session.understandingRating = Number(understandingRating) || undefined;
  session.feedback = (feedback ?? "").trim().slice(0, 800) || undefined;
  await saveSession(session);

  const tutor = await getUser(session.tutorId);
  if (tutor) {
    const count = (tutor.ratingCount ?? 0) + 1;
    const total = (tutor.rating ?? 0) * (tutor.ratingCount ?? 0) + stars;
    tutor.rating = Math.round((total / count) * 10) / 10;
    tutor.ratingCount = count;
    tutor.sessionsCompleted = (tutor.sessionsCompleted ?? 0) + 1;
    if (session.understandingRating) {
      const prev = tutor.understandingScore ?? 90;
      const next = (session.understandingRating / 5) * 100;
      tutor.understandingScore = Math.round(prev * 0.9 + next * 0.1);
    }
    await saveUser(tutor);
  }

  return ok({ session });
}
