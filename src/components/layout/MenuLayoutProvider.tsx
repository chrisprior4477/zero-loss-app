"use client";

import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { isMenuLayout, type MenuLayout } from "@/lib/navigation/menu-layout";
import { saveMenuLayout } from "@/lib/account/menu-layout-action";

type MenuChoice = {
  layout: MenuLayout;
  savedLayout: MenuLayout;
  preview: (layout: MenuLayout) => void;
  keep: (layout: MenuLayout) => void;
  cancel: () => void;
  save: () => void;
  pending: boolean;
  message: { text: string; error: boolean } | null;
  clearMessage: () => void;
};
const MenuLayoutContext = createContext<MenuChoice | null>(null);

export function MenuLayoutProvider({ initialLayout, accountId, children }: { initialLayout: MenuLayout; accountId?: string; children: ReactNode }) {
  const [savedLayout, setSavedLayout] = useState(initialLayout);
  const [layout, setLayout] = useState(initialLayout);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const storageKey = accountId ? `zero-loss:menu-trial:${accountId}` : null;
  useEffect(() => {
    if (!storageKey) return;
    const frame = requestAnimationFrame(() => {
      try {
        const trial = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
        if (trial?.savedLayout === initialLayout && isMenuLayout(trial.layout)) setLayout(trial.layout);
        else sessionStorage.removeItem(storageKey);
      } catch { /* Trial storage is optional; account preferences stay authoritative. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey, initialLayout]);
  function clearTrial() { try { if (storageKey) sessionStorage.removeItem(storageKey); } catch {} }
  function keep(choice: MenuLayout) { clearTrial(); setSavedLayout(choice); setLayout(choice); }
  function save() {
    if (pending || layout === savedLayout) return;
    const chosen = layout;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await saveMenuLayout(chosen);
        if (!result.ok) { setMessage({ text: result.message, error: true }); return; }
        keep(chosen);
        setMessage({ text: "Your menu choice is saved.", error: false });
      } catch { setMessage({ text: "Your menu choice could not be saved. Please try again.", error: true }); }
    });
  }
  return <MenuLayoutContext.Provider value={{
    layout, savedLayout,
    pending, message, save, clearMessage: () => setMessage(null),
    preview: choice => {
      if (pending) return;
      setLayout(choice); setMessage(null);
      try { if (storageKey) {
        if (choice === savedLayout) sessionStorage.removeItem(storageKey);
        else sessionStorage.setItem(storageKey, JSON.stringify({ layout: choice, savedLayout }));
      } } catch {}
    },
    keep,
    cancel: () => { if (!pending) { clearTrial(); setLayout(savedLayout); setMessage(null); } },
  }}>{children}</MenuLayoutContext.Provider>;
}

export function useMenuLayout() {
  const choice = useContext(MenuLayoutContext);
  if (!choice) throw new Error("Menu choices require MenuLayoutProvider.");
  return choice;
}
