import { currentUser } from "@/lib/auth";
import { ok } from "@/lib/api";
import { backendKind, getWallet } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return ok({ user: null, wallet: null, storage: await backendKind() });
  const wallet = user.role === "tutor" ? null : await getWallet(user.id);
  return ok({ user, wallet, storage: await backendKind() });
}
