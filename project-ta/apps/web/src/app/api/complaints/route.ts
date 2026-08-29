import { newId, type Complaint, type ComplaintCategory } from "@project-ta/shared";
import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { addComplaint } from "@/lib/store";

export const dynamic = "force-dynamic";

const CATEGORIES: ComplaintCategory[] = [
  "safeguarding",
  "tutor-quality",
  "payment",
  "technical",
  "other",
];

export async function POST(req: Request) {
  const user = await currentUser();
  const body = (await req.json()) as {
    category?: string;
    detail?: string;
    sessionId?: string;
    name?: string;
    email?: string;
  };

  const category = (body.category ?? "other") as ComplaintCategory;
  if (!CATEGORIES.includes(category)) return fail("Pick a category");
  if (!body.detail?.trim() || body.detail.trim().length < 15) {
    return fail("Please tell us what happened — at least a sentence");
  }

  const email = (body.email ?? user?.email ?? "").trim();
  if (!email.includes("@")) return fail("We need an email address to reply to");

  const complaint: Complaint = {
    id: newId("cmp"),
    reporterId: user?.id ?? "anonymous",
    reporterName: (body.name ?? user?.name ?? "Not given").trim().slice(0, 120),
    reporterEmail: email.slice(0, 200),
    sessionId: body.sessionId?.trim() || undefined,
    category,
    detail: body.detail.trim().slice(0, 4000),
    status: "open",
    createdAt: Date.now(),
    // Safeguarding reports skip the queue and go to the Designated Safeguarding Lead.
    urgent: category === "safeguarding",
  };

  await addComplaint(complaint);

  return ok({
    complaint: { id: complaint.id, urgent: complaint.urgent },
    // The published SLA, so the confirmation screen and the policy page agree.
    responseTarget: complaint.urgent ? "24 hours" : "3 working days",
  });
}
