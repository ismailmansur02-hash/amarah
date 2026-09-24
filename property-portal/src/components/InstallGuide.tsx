"use client";

import { useEffect, useState } from "react";
import { isIOS, isStandalone } from "./InstallPrompt";
import Disclosure from "./Disclosure";
import { BRAND } from "@/lib/brand";

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
      <div className="card fade-in mt-10 p-6">
        <p className="text-[15px] font-medium">The app is installed on this device.</p>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-2)]">
          Open it from your home screen or app list and sign in with the login your manager gave
          you.
        </p>
      </div>
    );
  }

  const guide = STEPS[platform];

  return (
    <div className="fade-in mt-10 space-y-5">
      {deferred && (
        <button onClick={install} className="btn w-full py-3.5">
          Install {BRAND.name} on this device
        </button>
      )}

      <div className="card p-6 sm:p-7">
        <p className="eyebrow">{guide.heading}</p>
        <ol className="mt-5 space-y-4">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex gap-4 text-[15px] leading-relaxed">
              <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-[12px] font-semibold text-[var(--ink-3)]">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <Disclosure label="Instructions for other devices" className="card p-6">
        <div className="mt-5 space-y-6">
          {(Object.keys(STEPS) as Exclude<Platform, "installed">[])
            .filter((k) => k !== platform)
            .map((k) => (
              <div key={k}>
                <p className="eyebrow">{STEPS[k].heading}</p>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-[var(--ink-2)]">
                  {STEPS[k].steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            ))}
        </div>
      </Disclosure>
    </div>
  );
}
