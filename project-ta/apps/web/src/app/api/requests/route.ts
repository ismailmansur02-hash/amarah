import {
  MATCH_WINDOW_SECONDS,
  newId,
  pricePence,
  tutorPayoutPence,
  type ExamBoard,
  type HelpRequest,
  type Level,
} from "@project-ta/shared";
import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getRequests, getWallet, saveRequest, saveWallet, sweepExpired } from "@/lib/store";
import { subjectById } from "@project-ta/shared";

export const dynamic = "force-dynamic";

/** The student's own history. */
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Sign in first", 401);
  await sweepExpired();
  const mine = (await getRequests()).filter((r) => r.studentId === user.id);
  return ok({ requests: mine });
}

interface CreateBody {
  subject: string;
  topic: string;
  level: Level;
  examBoard: ExamBoard;
  detail: string;
  durationMins: number;
  photo?: string;
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Sign in first", 401);
  if (user.role !== "student") return fail("Only student accounts can ask a question", 403);

  const body = (await req.json()) as CreateBody;
  if (!subjectById(body.subject)) return fail("Pick a subject");
  if (!body.topic?.trim()) return fail("Pick a topic");
  if (!body.detail?.trim() || body.detail.trim().length < 10) {
    return fail("Tell your tutor a bit more about what you're stuck on (at least 10 characters)");
  }
  const duration = Number(body.durationMins);
  if (![15, 30, 45].includes(duration)) return fail("Choose 15, 30 or 45 minutes");

  const price = pricePence(duration);
  const wallet = await getWallet(user.id);
  if (wallet.balancePence < price) {
    return fail("Not enough credit — top up on the payments page first", 402);
  }

  const now = Date.now();
  const request: HelpRequest = {
    id: newId("req"),
    studentId: user.id,
    subject: body.subject,
    topic: body.topic.trim(),
    level: body.level,
    examBoard: body.examBoard,
    detail: body.detail.trim().slice(0, 1200),
    photo: body.photo?.slice(0, 400_000),
    durationMins: duration,
    pricePence: price,
    tutorPayoutPence: tutorPayoutPence(duration),
    status: "pending",
    createdAt: now,
    expiresAt: now + MATCH_WINDOW_SECONDS * 1000,
  };

  // Hold the credit now; it is refunded automatically if nobody picks it up.
  wallet.balancePence -= price;
  wallet.transactions.unshift({
    id: newId("txn"),
    userId: user.id,
    kind: "spend",
    amountPence: -price,
    note: `${duration} min · ${request.topic}`,
    createdAt: now,
  });

  await saveWallet(wallet);
  await saveRequest(request);
  return ok({ request });
}
