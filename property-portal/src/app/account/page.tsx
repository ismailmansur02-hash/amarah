import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ApiForm from "@/components/ApiForm";
import Field from "@/components/Field";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const facts: [string, string][] = [
    ["Name", session.name],
    ["Username", session.username],
    ["Role", session.role],
  ];

  return (
    <div className="rise mx-auto max-w-lg">
      <Link
        href={session.role === "manager" ? "/dashboard" : "/my"}
        className="group inline-flex items-center gap-1.5 text-[14px] text-[var(--ink-2)] transition-colors duration-200 hover:text-[var(--ink)]"
      >
        <span className="transition-transform duration-300 ease-[var(--ease)] group-hover:-translate-x-0.5">
          ←
        </span>
        {session.role === "manager" ? "Dashboard" : "My properties"}
      </Link>

      <h1 className="display mt-5 text-[clamp(1.875rem,4.5vw,2.5rem)]">Your account</h1>

      <dl className="rows card mt-7 overflow-hidden">
        {facts.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-5 py-4">
            <dt className="label">{k}</dt>
            <dd className={k === "Username" ? "font-mono text-[14px]" : "text-[15px] capitalize"}>
              {v}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-12">
        <h2 className="display-sm text-xl">Change your password</h2>
        <ApiForm
          action={`/api/users/${session.uid}/password`}
          submitLabel="Update password"
          className="card mt-5 p-6"
        >
          <div className="space-y-4">
            <Field label="Current password">
              <input
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
              />
            </Field>
            <Field label="New password" hint="At least 8 characters">
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="input"
              />
            </Field>
          </div>
        </ApiForm>
      </div>
    </div>
  );
}
