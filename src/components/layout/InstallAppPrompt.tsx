"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const DISMISS_KEY = "zeroloss-install-prompt-dismissed-at";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type ManualInstall = "ios" | "safari" | null;

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function manualInstallPlatform(): ManualInstall {
  const userAgent = navigator.userAgent;
  const isiOS = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isiOS) return "ios";

  const isDesktopSafari = /Safari/.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(userAgent);
  return isDesktopSafari ? "safari" : null;
}

export function InstallAppPrompt() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [manualPlatform, setManualPlatform] = useState<ManualInstall>(null);
  const [interacted, setInteracted] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const initialize = window.setTimeout(() => {
      const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
      setDismissed(Date.now() - dismissedAt < DISMISS_FOR_MS);
      setManualPlatform(manualInstallPlatform());
    }, 0);

    const noteInteraction = () => setInteracted(true);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const noteInstalled = () => {
      deferredPrompt.current = null;
      setCanPrompt(false);
      setDismissed(true);
    };

    window.addEventListener("pointerdown", noteInteraction, { once: true });
    window.addEventListener("keydown", noteInteraction, { once: true });
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", noteInstalled);

    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener("pointerdown", noteInteraction);
      window.removeEventListener("keydown", noteInteraction);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", noteInstalled);
    };
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  const install = async () => {
    if (deferredPrompt.current) {
      const prompt = deferredPrompt.current;
      deferredPrompt.current = null;
      setCanPrompt(false);
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "dismissed") dismiss();
      return;
    }
    setShowInstructions(true);
  };

  const visible = interacted && !dismissed && (canPrompt || manualPlatform !== null);
  if (!visible) return null;

  const instructions = manualPlatform === "ios"
    ? "Tap your browser’s Share button, then choose Add to Home Screen."
    : "In Safari, open the File menu and choose Add to Dock.";

  return (
    <aside aria-label="Install Zero Loss" aria-live="polite" className="fixed inset-x-3 bottom-3 z-[110] mx-auto max-w-[430px] rounded-2xl border border-cyan-200/35 bg-[#03172f]/95 p-4 shadow-[0_18px_55px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:mx-0">
      <div className="flex items-start gap-3">
        <Image src="/icons/zeroloss-icon-64.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold text-white">Install Zero Loss</p>
          <p className="mt-1 text-[12px] leading-5 text-white/70">{showInstructions ? instructions : "Keep Zero Loss one tap away on this device."}</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss install suggestion" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xl text-white/60 hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">×</button>
      </div>
      {!showInstructions && (
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={dismiss} className="min-h-10 rounded-lg px-4 text-[12px] font-bold text-white/65 hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Not now</button>
          <button type="button" onClick={install} className="min-h-10 rounded-lg bg-[#087feb] px-5 text-[12px] font-extrabold text-white shadow-[0_8px_20px_rgba(8,127,235,.3)] hover:bg-[#1692ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">Install</button>
        </div>
      )}
    </aside>
  );
}
