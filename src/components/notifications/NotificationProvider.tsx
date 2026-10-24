"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { BannerStyle } from "@/lib/account/banner-style";
import { notificationIsEnabled, type AccountNotification, type NotificationPreferences } from "@/lib/account/notifications";
import { markNotificationsRead } from "@/lib/account/notification-read-actions";
type Snapshot = { notifications: AccountNotification[]; readIds: string[]; readAvailable: boolean; preferences: NotificationPreferences | null };
type Value = { enabled: boolean; setEnabled: (enabled: boolean) => void; style: BannerStyle; setStyle: (style: BannerStyle) => void; unread: AccountNotification[]; open: boolean; setOpen: (open: boolean) => void; markRead: (ids: string[]) => Promise<void> };
const Context = createContext<Value | null>(null);
export function NotificationProvider({ children, initial, initialStyle, initialEnabled }: { children: ReactNode; initial: Snapshot | null; initialStyle: BannerStyle; initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [snapshot, setSnapshot] = useState(initial);
  const [style, setStyle] = useState(initialStyle);
  const [open, setOpen] = useState(false);
  const savedReads = useRef(new Set<string>());
  const pathname = usePathname();
  useEffect(() => { setSnapshot(initial); }, [initial]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { setEnabled(initialEnabled); }, [initialEnabled]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { setStyle(initialStyle); }, [initialStyle]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!initial) return;
    const controller = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || pending) return;
      pending = true;
      try {
        const response = await fetch("/api/account/notifications", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) { setSnapshot(null); return; }
        if (response.ok) {
          const next: Snapshot = await response.json();
          setSnapshot({ ...next, readIds: [...new Set([...next.readIds, ...savedReads.current])] });
        }
      } catch { /* Keep the last verified snapshot when offline. */ }
      finally { pending = false; }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("zero-loss-notifications-read", refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("zero-loss-notifications-read", refresh); };
  }, [pathname, Boolean(initial)]); // eslint-disable-line react-hooks/exhaustive-deps
  const markRead = useCallback(async (ids: string[]) => {
    const result = await markNotificationsRead(ids);
    if (!result.ok) throw new Error(result.message);
    ids.forEach(id => savedReads.current.add(id));
    setSnapshot(current => current ? { ...current, readIds: [...new Set([...current.readIds, ...ids])] } : null);
  }, []);
  const read = new Set(snapshot?.readIds);
  const unread = snapshot?.readAvailable && snapshot.preferences ? snapshot.notifications.filter(n => !read.has(n.id) && notificationIsEnabled(n, snapshot.preferences!)) : [];
  return <Context.Provider value={{ enabled, setEnabled, style, setStyle, unread, open, setOpen, markRead }}>{children}</Context.Provider>;
}
export function useNotifications() { return useContext(Context); }
