"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "emgmt-install-dismissed";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes standalone mode on navigator instead.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
}

/**
 * Bottom banner offering to install the portal as an app. Chrome/Edge/Android
 * get a one-tap install; iOS has no install API, so it gets the Share-sheet
 * instructions instead. Hidden once installed or dismissed.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    if (isIOS()) {
      setShowIOSHint(true);
      setHidden(false);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => setHidden(true);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setHidden(true);
    setDeferred(null);
  }

  if (hidden) return null;

  return (
    <>
      {/* Reserves scroll room so the fixed banner never covers page content. */}
      <div aria-hidden className="h-28 sm:h-24" />
      <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-white shadow-lg sm:p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg font-bold">
            E<span className="text-emerald-400">,</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Install E, Management</p>
            <p className="text-xs text-slate-300">
              {showIOSHint
                ? "Tap the Share button, then “Add to Home Screen”."
                : "Add it to your device to check your properties any time."}
            </p>
          </div>
          {!showIOSHint && (
            <button
              onClick={install}
              className="shrink-0 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-md px-2 py-1.5 text-sm text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
