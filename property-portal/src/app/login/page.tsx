import Link from "next/link";
import { BRAND } from "@/lib/brand";
import LoginForm from "@/components/LoginForm";

/* Static, for the same reason as the landing page: middleware sends anyone
   who already has a session straight to their own screens. */
export default function LoginPage() {
  return (
    <div className="marketing flex min-h-[100svh] flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[26rem]">
        <Link href="/" className="block text-center text-xl font-semibold tracking-tight">
          {BRAND.mark} <span className="text-[var(--ink-3)]">{BRAND.rest}</span>
        </Link>

        <div className="mt-10">
          <h1 className="display-sm text-center text-3xl">Sign in</h1>
          <p className="mt-3 text-center text-[15px] text-[var(--ink-2)]">
            Use the login your property manager gave you.
          </p>
          <LoginForm />
        </div>

        <p className="mt-10 text-center text-sm text-[var(--ink-3)]">
          <Link href="/install" className="font-medium text-[var(--ink)] hover:underline">
            Install the app on your phone
          </Link>{" "}
          to check your property any time.
        </p>
      </div>
    </div>
  );
}
