import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "manager" ? "/dashboard" : "/my");
  return (
    <div className="mx-auto mt-16 max-w-md">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          {BRAND.mark} <span className="text-slate-400">{BRAND.rest}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in with the login provided by your property manager.
        </p>
        <LoginForm />
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/install" className="font-medium text-sky-700 hover:underline">
          Install the app on your phone
        </Link>{" "}
        to check your properties any time.
      </p>
    </div>
  );
}
