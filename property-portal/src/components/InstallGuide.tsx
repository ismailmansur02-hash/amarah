"use client";

import { useEffect, useState } from "react";
import { isIOS, isStandalone } from "./InstallPrompt";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android-chrome" | "desktop" | "installed";

const STEPS: Record<Exclude<Platform, "installed">, { heading: string; steps: string[] }> = {
  ios: {
    heading: "iPhone or iPad (Safari)",
    steps: [
      "Open this page in Safari.",
      "Tap the Share button at the bottom of the screen.",
      "Scroll down and tap “Add to Home Screen”.",
      "Tap “Add”. The app icon appears on your home screen.",
    ],
  },
  "android-chrome": {
    heading: "Android (Chrome)",
    steps: [
      "Tap the Install button above, or open Chrome's ⋮ menu.",
      "Choose “Install app” or “Add to Home screen”.",
      "Confirm. The app icon appears in your app drawer.",
    ],
  },
  desktop: {
    heading: "Computer (Chrome or Edge)",
    steps: [
      "Click the Install button above, or the install icon in the address bar.",
      "Confirm “Install”.",
      "The portal opens in its own window like any other program.",
    ],
  },
};

export default function InstallGuide() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setPlatform("installed");
      return;
    }
    if (isIOS()) {
      setPlatform("ios");
      return;
    }
    setPlatform(/Android/i.test(navigator.userAgent) ? "android-chrome" : "desktop");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  if (platform === null) return null;

  if (platform === "installed" || installed) {
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-medium text-emerald-900">The app is installed on this device.</p>
        <p className="mt-1 text-sm text-emerald-700">
          Open it from your home screen or app list and sign in with the login your manager gave you.
        </p>
      </div>
    );
  }

  const guide = STEPS[platform];

  return (
    <div className="mt-6 space-y-4">
      {deferred && (
        <button
          onClick={install}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Install E, Management on this device
        </button>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {guide.heading}
        </h2>
        <ol className="mt-3 space-y-2">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <details className="rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-medium text-sky-700">
          Instructions for other devices
        </summary>
        <div className="mt-4 space-y-4">
          {(Object.keys(STEPS) as Exclude<Platform, "installed">[])
            .filter((k) => k !== platform)
            .map((k) => (
              <div key={k}>
                <h3 className="text-sm font-semibold text-slate-700">{STEPS[k].heading}</h3>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                  {STEPS[k].steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            ))}
        </div>
      </details>
    </div>
  );
}
