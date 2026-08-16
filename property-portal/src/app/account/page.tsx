import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ApiForm from "@/components/ApiForm";

// Authenticated page: always render fresh, and never let a CDN hold on to
// one person's view and hand it to somebody else.
export const dynamic = "force-dynamic";

const inputCls =
  "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={session.role === "manager" ? "/dashboard" : "/my"}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Back to {session.role === "manager" ? "dashboard" : "my properties"}
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your account</h1>

      <dl className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm">
        <div className="flex justify-between py-1">
          <dt className="text-slate-500">Name</dt>
          <dd className="font-medium">{session.name}</dd>
        </div>
        <div className="flex justify-between py-1">
          <dt className="text-slate-500">Username</dt>
          <dd className="font-mono text-xs">{session.username}</dd>
        </div>
        <div className="flex justify-between py-1">
          <dt className="text-slate-500">Role</dt>
          <dd className="font-medium capitalize">{session.role}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Change your password</h2>
        <ApiForm
          action={`/api/users/${session.uid}/password`}
          submitLabel="Update password"
          className="mt-3 rounded-xl border border-slate-200 bg-white p-5"
        >
          <label className="block text-xs font-medium text-slate-500">
            Current password
            <input name="current_password" type="password" required autoComplete="current-password" className={inputCls} />
          </label>
          <label className="mt-3 block text-xs font-medium text-slate-500">
            New password (at least 8 characters)
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
          </label>
        </ApiForm>
      </div>
    </div>
  );
}
