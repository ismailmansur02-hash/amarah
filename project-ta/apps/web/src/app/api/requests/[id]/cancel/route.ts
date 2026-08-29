import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getRequest, refundRequest, saveRequest } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return fail("Sign in first", 401);

  const request = await getRequest(id);
  if (!request) return fail("Not found", 404);
  if (request.studentId !== user.id) return fail("That isn't your question", 403);
  if (request.status !== "pending") return fail("Too late to cancel — a tutor has it", 409);

  request.status = "cancelled";
  await saveRequest(request);
  await refundRequest(request);
  return ok({ request });
}
