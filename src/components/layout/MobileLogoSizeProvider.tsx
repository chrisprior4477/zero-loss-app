"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { isMobileLogoSize, type MobileLogoSize } from "@/lib/navigation/mobile-logo-size";
import { saveMobileLogoSize } from "@/lib/account/mobile-logo-size-action";

type LogoChoice = {
  size: MobileLogoSize;
  savedSize: MobileLogoSize;
  trying: boolean;
  pending: boolean;
  message: { text: string; error: boolean } | null;
  preview: (size: MobileLogoSize) => void;
  save: () => void;
  cancel: () => void;
  dismiss: () => void;
};
const defaultChoice: LogoChoice = { size: 0, savedSize: 0, trying: false, pending: false, message: null, preview: () => {}, save: () => {}, cancel: () => {}, dismiss: () => {} };
const MobileLogoSizeContext = createContext<LogoChoice>(defaultChoice);

export function MobileLogoSizeProvider({ initialSize = 0, accountId, children }: { initialSize?: MobileLogoSize; accountId?: string; children: ReactNode }) {
  const [size, setSize] = useState(initialSize);
  const [savedSize, setSavedSize] = useState(initialSize);
  const [trying, setTrying] = useState(false);
  const [message, setMessage] = useState<LogoChoice["message"]>(null);
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);
  const interacted = useRef(false);
  // AppShell keys this provider by account. Restore a trial only on that account's mount,
  // not when a save revalidates the surrounding server layout.
  const initial = useRef(initialSize);
  const storageKey = accountId ? `zero-loss:logo-size-trial:${accountId}` : null;
  const [serverSize, setServerSize] = useState(initialSize);
  const cachedServerSize = useRef(initialSize);
  // Server-confirmed choices must not keep asking to be saved after an account refresh.
  // The balance-based visual fit never changes initialSize or the preferred size.
  if (serverSize !== initialSize) {
    setServerSize(initialSize);
    setSavedSize(initialSize);
    if (size === savedSize || size === initialSize) {
      setSize(initialSize); setTrying(false); setMessage(null);
    }
  }
  useEffect(() => {
    if (cachedServerSize.current === initialSize) return;
    cachedServerSize.current = initialSize;
    interacted.current = true;
    try {
      if (!storageKey) return;
      if (size === savedSize) sessionStorage.removeItem(storageKey);
      else sessionStorage.setItem(storageKey, JSON.stringify({ size, savedSize, dismissed: !trying }));
    } catch { /* Refreshed account preferences still take effect without trial storage. */ }
  }, [initialSize, size, savedSize, trying, storageKey]);
  useEffect(() => {
    if (!storageKey) return;
    const frame = requestAnimationFrame(() => {
      if (interacted.current) return;
      try {
        const trial = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
        if (trial?.savedSize === initial.current && isMobileLogoSize(trial.size) && trial.size !== initial.current) {
          setSize(trial.size); setTrying(trial.dismissed !== true);
        } else sessionStorage.removeItem(storageKey);
      } catch { /* The saved account preference remains authoritative. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);
  function storeTrial(choice: MobileLogoSize, saved: MobileLogoSize, dismissed = false) {
    try { if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify({ size: choice, savedSize: saved, dismissed })); } catch {}
  }
  function save() {
    if (saving.current || size === savedSize) return;
    interacted.current = true;
    const chosen = size;
    saving.current = true; setMessage(null);
    startTransition(async () => {
      try {
        const result = await saveMobileLogoSize(chosen);
        if (!result.ok) { setMessage({ text: result.message, error: true }); return; }
        setSavedSize(chosen); setTrying(false);
        try { if (storageKey) sessionStorage.removeItem(storageKey); } catch {}
        setMessage({ text: "Your mobile logo size is saved.", error: false });
      } catch { setMessage({ text: "Your logo size could not be saved. Please try again.", error: true }); }
      finally { saving.current = false; }
    });
  }
  return <MobileLogoSizeContext.Provider value={{ size, savedSize, trying, pending, message, save,
    preview: choice => {
      if (saving.current || !isMobileLogoSize(choice)) return;
      interacted.current = true;
      setSize(choice); setTrying(choice !== savedSize); setMessage(null);
      if (choice !== savedSize) storeTrial(choice, savedSize);
      else { try { if (storageKey) sessionStorage.removeItem(storageKey); } catch {} }
    },
    cancel: () => {
      if (saving.current) return;
      interacted.current = true;
      setSize(savedSize); setTrying(false); setMessage(null);
      try { if (storageKey) sessionStorage.removeItem(storageKey); } catch {}
    },
    dismiss: () => {
      if (saving.current) return;
      interacted.current = true;
      setTrying(false); setMessage(null);
      if (size !== savedSize) storeTrial(size, savedSize, true);
      else { try { if (storageKey) sessionStorage.removeItem(storageKey); } catch {} }
    },
  }}>{children}</MobileLogoSizeContext.Provider>;
}

export function useMobileLogoSize() { return useContext(MobileLogoSizeContext); }
