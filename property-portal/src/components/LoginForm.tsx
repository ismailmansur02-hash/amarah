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
        <label className="block text-sm font-medium text-slate-300">Username</label>
        <input
          name="username"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-emerald-400/60 focus:bg-white/10 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300">Password</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-emerald-400/60 focus:bg-white/10 focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
