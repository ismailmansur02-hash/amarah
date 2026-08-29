import { ok } from "@/lib/api";
import { backendKind } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ status: "ok", storage: await backendKind(), time: Date.now() });
}
