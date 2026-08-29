import { CREDIT_PACKS, newId } from "@project-ta/shared";
import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getWallet, saveWallet } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * MOCKED PAYMENT.
 *
 * No card details are collected, transmitted or stored anywhere in this build —
 * the card form on /pay is a visual placeholder and its values never leave the
 * browser. Going live means Stripe Checkout here for the charge and Stripe
 * Connect for tutor payouts, at which point no card data touches our servers
 * either.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Sign in first", 401);
  if (user.role === "tutor") return fail("Tutor accounts don't hold credit", 403);

  const { packId } = (await req.json()) as { packId?: string };
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return fail("Pick a credit pack");

  const wallet = await getWallet(user.id);
  wallet.balancePence += pack.creditPence;
  wallet.transactions.unshift({
    id: newId("txn"),
    userId: user.id,
    kind: "topup",
    amountPence: pack.creditPence,
    note: `${pack.name} — mocked payment, no card charged`,
    createdAt: Date.now(),
  });
  await saveWallet(wallet);

  return ok({ wallet, pack });
}
