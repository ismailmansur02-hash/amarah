"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Generic form that POSTs its fields as FormData to an API route and
 * refreshes the current server-rendered page on success.
 */
export default function ApiForm({
  action,
  children,
  submitLabel,
  className = "",
  buttonClassName = "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50",
  resetOnSuccess = true,
}: {
  action: string;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  buttonClassName?: string;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);

    try {
      // Bounded, so the button can never sit on "Saving…" forever if the
      // server is slow to wake or never answers.
      const res = await fetch(action, {
        method: "POST",
        body: new FormData(form),
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "That did not save. Try again.");
        return;
      }

      if (resetOnSuccess) form.reset();
      router.refresh();
    } catch {
      setError("That took too long and was not saved. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={busy} className={buttonClassName}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
