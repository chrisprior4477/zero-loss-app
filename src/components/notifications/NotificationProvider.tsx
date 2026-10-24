"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { BannerStyle } from "@/lib/account/banner-style";
import { notificationIsEnabled, type AccountNotification, type NotificationPreferences } from "@/lib/account/notifications";
import { markNotificationsRead } from "@/lib/account/notification-read-actions";
import { restoreNotificationBanner } from "@/lib/account/restore-banner-action";
type Snapshot = { notifications: AccountNotification[]; readIds: string[]; readAvailable: boolean; preferences: NotificationPreferences | null };
type Value = { speed: number; setSpeed: (speed: number) => void; displaySeconds: number; setDisplaySeconds: (seconds: number) => void; enabled: boolean; setEnabled: (enabled: boolean) => void; style: BannerStyle; setStyle: (style: BannerStyle) => void; notifications: AccountNotification[]; unread: AccountNotification[]; open: boolean; setOpen: (open: boolean) => void; markRead: (ids: string[]) => Promise<void>; restoreBanner: () => Promise<string>; bannerHidden: boolean; setBannerHidden: (hidden: boolean) => void };
const Context = createContext<Value | null>(null);
export function NotificationProvider({ children, initial, initialStyle, initialEnabled, initialSpeed = 5, initialDisplaySeconds = 6 }: { children: ReactNode; initial: Snapshot | null; initialStyle: BannerStyle; initialEnabled: boolean; initialSpeed?: number; initialDisplaySeconds?: number }) {
  const [speed, setSpeed] = useState(initialSpeed);
  const [displaySeconds, setDisplaySeconds] = useState(initialDisplaySeconds);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [snapshot, setSnapshot] = useState(initial);
  const [style, setStyle] = useState(initialStyle);
  const [open, setOpen] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);
  const readChanges = useRef(new Map<string, boolean>());
  const revision = useRef(0);
  const mergeReads = useCallback((next: Snapshot | null) => {
    if (!next) return null;
    const reads = new Set(next.readIds);
    readChanges.current.forEach((isRead, id) => { if (isRead) reads.add(id); else reads.delete(id); });
    return { ...next, readIds: [...reads] };
  }, []);
  const pathname = usePathname();
  useEffect(() => { setSpeed(initialSpeed); }, [initialSpeed]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { setDisplaySeconds(initialDisplaySeconds); }, [initialDisplaySeconds]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { setSnapshot(mergeReads(initial)); }, [initial, mergeReads]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { setEnabled(initialEnabled); }, [initialEnabled]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { setStyle(initialStyle); }, [initialStyle]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!initial) return;
    const controller = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || pending) return;
      pending = true;
      const requestedRevision = revision.current;
      try {
        const response = await fetch("/api/account/notifications", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) { setSnapshot(null); return; }
        if (response.ok) {
          const next: Snapshot = await response.json();
          if (requestedRevision !== revision.current) return;
          const confirmed = new Set(next.readIds);
          readChanges.current.forEach((isRead, id) => { if (confirmed.has(id) === isRead) readChanges.current.delete(id); });
          setSnapshot(mergeReads(next));
        }
      } catch { /* Keep the last verified snapshot when offline. */ }
      finally { pending = false; }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("zero-loss-notifications-read", refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("zero-loss-notifications-read", refresh); };
  }, [pathname, Boolean(initial), mergeReads]); // eslint-disable-line react-hooks/exhaustive-deps
  const markRead = useCallback(async (ids: string[]) => {
    revision.current++;
    for (let offset = 0; offset < ids.length; offset += 500) {
      const result = await markNotificationsRead(ids.slice(offset, offset + 500));
      if (!result.ok) throw new Error(result.message);
    }
    revision.current++;
    ids.forEach(id => readChanges.current.set(id, true));
    setSnapshot(current => current ? { ...current, readIds: [...new Set([...current.readIds, ...ids])] } : null);
  }, []);
  const restoreBanner = useCallback(async () => {
    revision.current++;
    const result = await restoreNotificationBanner();
    if (!result.ok) throw new Error(result.message);
    revision.current++;
    result.ids.forEach(id => readChanges.current.set(id, false));
    setSnapshot(mergeReads(result.snapshot));
    setEnabled(true);
    setBannerHidden(false);
    // Keep the page visible so the restored animation can be tried immediately.
    setOpen(false);
    return result.message;
  }, [mergeReads]);
  const read = new Set(snapshot?.readIds);
  const notifications = snapshot?.readAvailable && snapshot.preferences ? snapshot.notifications.filter(n => notificationIsEnabled(n, snapshot.preferences!)) : [];
  const unread = notifications.filter(n => !read.has(n.id));
  return <Context.Provider value={{ speed, setSpeed, displaySeconds, setDisplaySeconds, enabled, setEnabled, style, setStyle, notifications, unread, open, setOpen, markRead, restoreBanner, bannerHidden, setBannerHidden }}>{children}</Context.Provider>;
}
export function useNotifications() { return useContext(Context); }
