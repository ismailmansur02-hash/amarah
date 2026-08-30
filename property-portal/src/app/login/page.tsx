import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "manager" ? "/dashboard" : "/my");

  return (
    <div className="marketing relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#05070d] px-4 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora absolute -left-1/4 top-[-25%] h-[60vh] w-[60vh] rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="aurora-slow absolute -right-1/4 bottom-[-25%] h-[60vh] w-[60vh] rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute inset-0 grid-lines opacity-30" />
      </div>

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 block text-center text-2xl font-semibold tracking-tight text-white">
          {BRAND.mark} <span className="text-slate-500">{BRAND.rest}</span>
        </Link>

        <div className="glass rise rounded-2xl p-8">
          <h1 className="text-xl font-semibold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-slate-400">
            Use the login your property manager gave you.
          </p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/install" className="font-medium text-emerald-400 hover:text-emerald-300">
            Install the app on your phone
          </Link>{" "}
          to check your property any time.
        </p>
      </div>
    </div>
  );
}
