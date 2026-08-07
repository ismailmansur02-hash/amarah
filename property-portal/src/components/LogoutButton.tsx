"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    // Drop anything the service worker is holding so a shared device keeps
    // nothing after sign-out.
    navigator.serviceWorker?.controller?.postMessage("clear-caches");
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
    >
      Sign out
    </button>
  );
}
