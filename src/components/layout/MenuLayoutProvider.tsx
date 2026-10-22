"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { isMenuDevice, isMenuLayout, type MenuDevice, type MenuLayout, type MenuLayoutsByDevice } from "@/lib/navigation/menu-layout";
import { saveMenuLayout } from "@/lib/account/menu-layout-action";

type MenuChoice = {
  layout: MenuLayout;
  savedLayout: MenuLayout;
  trying: boolean;
  preview: (layout: MenuLayout) => void;
  keep: (layout: MenuLayout) => void;
  cancel: () => void;
  dismiss: () => void;
  save: () => void;
  pending: boolean;
  message: { text: string; error: boolean } | null;
  clearMessage: () => void;
};
type DeviceMenuChoice = MenuChoice & {
  device: MenuDevice;
  selectDevice: (device: MenuDevice) => void;
  layouts: MenuLayoutsByDevice;
};
const MenuLayoutContext = createContext<DeviceMenuChoice | null>(null);

function trialKey(accountId: string, device: MenuDevice) {
  return `zero-loss:menu-trial:${accountId}${device === "mobile" ? "" : `:${device}`}`;
}

function useDeviceMenuChoice(initialLayout: MenuLayout, device: MenuDevice, accountId?: string): MenuChoice {
  const [savedLayout, setSavedLayout] = useState(initialLayout);
  const [layout, setLayout] = useState(initialLayout);
  const [trying, setTrying] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const interacted = useRef(false);
  const saving = useRef(false);
  const storageKey = accountId ? trialKey(accountId, device) : null;
  useEffect(() => {
    if (!storageKey) return;
    const frame = requestAnimationFrame(() => {
      // A late restore must never replace or clear a choice just made/saved.
      if (interacted.current) return;
      try {
        const trial = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
        // A saved choice is not an unfinished trial (including legacy cached records).
        if (trial?.savedLayout === initialLayout && isMenuLayout(trial.layout) && trial.layout !== initialLayout) { setLayout(trial.layout); setTrying(trial.dismissed !== true); }
        else sessionStorage.removeItem(storageKey);
      } catch { /* Trial storage is optional; account preferences stay authoritative. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey, initialLayout]);
  function clearTrial() { try { if (storageKey) sessionStorage.removeItem(storageKey); } catch {} }
  function storeTrial(choice: MenuLayout, savedChoice: MenuLayout, dismissed = false) {
    try { if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify({ layout: choice, savedLayout: savedChoice, dismissed })); } catch {}
  }
  function keep(choice: MenuLayout) { interacted.current = true; clearTrial(); setTrying(false); setSavedLayout(choice); setLayout(choice); }
  function save() {
    if (saving.current || layout === savedLayout) return;
    interacted.current = true;
    saving.current = true;
    const chosen = layout;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await saveMenuLayout(chosen, device);
        if (!result.ok) { setMessage({ text: result.message, error: true }); return; }
        setSavedLayout(chosen);
        clearTrial(); setTrying(false);
        setMessage({ text: `Your ${device} menu choice is saved.`, error: false });
      } catch { setMessage({ text: "Your menu choice could not be saved. Please try again.", error: true }); }
      finally { saving.current = false; }
    });
  }
  return {
    layout, savedLayout, trying,
    pending, message, save, clearMessage: () => setMessage(null),
    preview: choice => {
      if (saving.current) return;
      interacted.current = true;
      setLayout(choice); setTrying(choice !== savedLayout); setMessage(null);
      if (choice === savedLayout) clearTrial(); else storeTrial(choice, savedLayout);
    },
    keep,
    cancel: () => { if (!pending) { interacted.current = true; clearTrial(); setTrying(false); setLayout(savedLayout); setMessage(null); } },
    dismiss: () => {
      if (pending) return;
      interacted.current = true;
      setTrying(false); setMessage(null);
      if (layout === savedLayout) clearTrial(); else storeTrial(layout, savedLayout, true);
    },
  };
}

export function MenuLayoutProvider({ initialLayout, initialTabletLayout = "classic", initialDesktopLayout = "classic", accountId, children }: {
  initialLayout: MenuLayout; initialTabletLayout?: MenuLayout; initialDesktopLayout?: MenuLayout; accountId?: string; children: ReactNode;
}) {
  const mobile = useDeviceMenuChoice(initialLayout, "mobile", accountId);
  const tablet = useDeviceMenuChoice(initialTabletLayout, "tablet", accountId);
  const desktop = useDeviceMenuChoice(initialDesktopLayout, "desktop", accountId);
  const choices = { mobile, tablet, desktop };
  const [device, setDevice] = useState<MenuDevice>("mobile");
  const selected = useRef(false);
  const targetKey = accountId ? `zero-loss:menu-trial-target:${accountId}` : null;
  useEffect(() => {
    if (!targetKey || !accountId) return;
    const frame = requestAnimationFrame(() => {
      if (selected.current) return;
      try {
        const target = sessionStorage.getItem(targetKey);
        const initial = { mobile: initialLayout, tablet: initialTabletLayout, desktop: initialDesktopLayout };
        if (isMenuDevice(target)) {
          const trial = JSON.parse(sessionStorage.getItem(trialKey(accountId, target)) ?? "null");
          if (trial?.savedLayout === initial[target] && isMenuLayout(trial.layout) && trial.layout !== initial[target]) setDevice(target);
          else sessionStorage.removeItem(targetKey);
        }
      } catch { /* Defaults to Mobile when no unfinished trial exists. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [targetKey, accountId, initialLayout, initialTabletLayout, initialDesktopLayout]);
  const pending = mobile.pending || tablet.pending || desktop.pending;
  return <MenuLayoutContext.Provider value={{ ...choices[device], pending, device,
    layouts: { mobile: mobile.layout, tablet: tablet.layout, desktop: desktop.layout },
    selectDevice: target => {
      if (pending || !isMenuDevice(target)) return;
      selected.current = true; setDevice(target);
      try { if (targetKey) sessionStorage.setItem(targetKey, target); } catch {}
    },
    preview: layout => {
      selected.current = true;
      choices[device].preview(layout);
      try { if (targetKey) sessionStorage.setItem(targetKey, device); } catch {}
    },
  }}>{children}</MenuLayoutContext.Provider>;
}

export function useMenuLayout() {
  const choice = useContext(MenuLayoutContext);
  if (!choice) throw new Error("Menu choices require MenuLayoutProvider.");
  return choice;
}
