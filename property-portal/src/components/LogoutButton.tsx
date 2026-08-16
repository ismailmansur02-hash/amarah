"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/logout", { method: "POST" });

    // Drop anything the service worker is holding.
    navigator.serviceWorker?.controller?.postMessage("clear-caches");

    // A full page load rather than a client-side route change. Pages are now
    // held briefly in the router's in-memory cache, and on a shared device the
    // next person to sign in must not be able to see the previous person's
    // screens. Reloading the document throws that memory away entirely.
    window.location.href = "/login";
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
