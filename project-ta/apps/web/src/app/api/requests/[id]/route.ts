import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getRequest, getUser, sweepExpired } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Polled by the student's waiting screen until a tutor picks the question up. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return fail("Sign in first", 401);

  await sweepExpired();
  const request = await getRequest(id);
  if (!request) return fail("Not found", 404);
  if (request.studentId !== user.id && request.matchedTutorId !== user.id) {
    return fail("Not yours", 403);
  }

  const tutor = request.matchedTutorId ? await getUser(request.matchedTutorId) : null;
  return ok({ request, tutor, serverTime: Date.now() });
}
