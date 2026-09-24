"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      // Never let the button sit on "Signing in…" indefinitely. If the server
      // is slow to wake or never answers, say so rather than leaving someone
      // staring at a form that looks like it is still working.
      const res = await fetch("/api/login", {
        method: "POST",
        body: new FormData(e.currentTarget),
        signal: AbortSignal.timeout(20_000),
      });

      if (res.status === 401) {
        setError("That username or password is not right.");
        return;
      }
      if (res.status === 503) {
        // The database had gone to sleep. It wakes itself, but it takes a
        // couple of minutes — so say that, rather than letting someone
        // conclude their password is wrong.
        setError(
          "The database was asleep and is waking up. This takes a minute or two — your login is fine, try again shortly."
        );
        return;
      }
      if (!res.ok) {
        setError("The server could not be reached just now. Wait a moment and try again.");
        return;
      }

      const data = await res.json();
      router.push(data.role === "manager" ? "/dashboard" : "/my");
      router.refresh();
    } catch {
      setError(
        "Signing in took too long. The database may have been asleep — try once more and it should wake up."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-[var(--ink-2)]">Username</label>
        <input
          name="username"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="mt-1.5 w-full rounded-xl border border-black/[0.12] bg-white px-3.5 py-3 text-[15px] transition-colors duration-200 focus:border-black/40 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-[var(--ink-2)]">Password</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-xl border border-black/[0.12] bg-white px-3.5 py-3 text-[15px] transition-colors duration-200 focus:border-black/40 focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-[var(--ink)] px-4 py-3 text-[15px] font-medium text-white transition-colors duration-300 hover:bg-black disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
