import { newId, pricePence, tutorPayoutPence, type Message } from "@project-ta/shared";
import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { addMessage, getSession, getWallet, saveSession, saveWallet } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Buying more time mid-session. The tutor's share of the extension is identical. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return fail("Sign in first", 401);
  if (user.role !== "student") return fail("Only the student can buy more time", 403);

  const session = await getSession(id);
  if (!session) return fail("Session not found", 404);
  if (session.studentId !== user.id) return fail("Not your session", 403);
  if (session.status !== "active") return fail("This session has ended", 409);

  const { minutes } = (await req.json()) as { minutes?: number };
  const mins = Number(minutes);
  if (![15, 30].includes(mins)) return fail("You can add 15 or 30 minutes");

  const cost = pricePence(mins);
  const wallet = await getWallet(user.id);
  if (wallet.balancePence < cost) return fail("Not enough credit to extend", 402);

  wallet.balancePence -= cost;
  wallet.transactions.unshift({
    id: newId("txn"),
    userId: user.id,
    kind: "spend",
    amountPence: -cost,
    note: `Extended by ${mins} min · ${session.topic}`,
    createdAt: Date.now(),
  });
  await saveWallet(wallet);

  session.endsAt += mins * 60_000;
  session.extensionsMins += mins;
  session.tutorPayoutPence += tutorPayoutPence(mins);
  await saveSession(session);

  const note: Message = {
    id: newId("msg"),
    sessionId: id,
    senderId: "system",
    senderRole: "admin",
    senderName: "Project TA",
    kind: "system",
    body: `${mins} more minutes added.`,
    createdAt: Date.now(),
  };
  await addMessage(note);

  return ok({ session });
}
