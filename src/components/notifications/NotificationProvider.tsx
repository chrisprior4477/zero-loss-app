"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { BannerStyle, NotificationPopupStyle } from "@/lib/account/banner-style";
import { notificationIsEnabled, type AccountNotification, type NotificationPreferences } from "@/lib/account/notifications";
import { restoreNotificationBanner } from "@/lib/account/restore-banner-action";
type Snapshot = { notifications: AccountNotification[]; readIds: string[]; readAvailable: boolean; preferences: NotificationPreferences | null; supportEnabled?: boolean };
type Value = { popupStyle: NotificationPopupStyle; setPopupStyle: (style: NotificationPopupStyle) => void; supportEnabled: boolean; clearAfterDemoReset: () => void; speed: number; setSpeed: (speed: number) => void; displaySeconds: number; setDisplaySeconds: (seconds: number) => void; enabled: boolean; setEnabled: (enabled: boolean) => void; style: BannerStyle; setStyle: (style: BannerStyle) => void; notifications: AccountNotification[]; unread: AccountNotification[]; open: boolean; setOpen: (open: boolean) => void; markRead: (ids: string[]) => Promise<void>; restoreBanner: () => Promise<string>; bannerHidden: boolean; setBannerHidden: (hidden: boolean) => void };
const Context = createContext<Value | null>(null);
export function NotificationProvider({ children, initial, initialStyle, initialEnabled, initialSpeed = 5, initialDisplaySeconds = 6, initialPopupStyle = "rounded" }: { children: ReactNode; initial: Snapshot | null; initialStyle: BannerStyle; initialEnabled: boolean; initialSpeed?: number; initialDisplaySeconds?: number; initialPopupStyle?: NotificationPopupStyle }) {
  const [popupStyle, setPopupStyle] = useState(initialPopupStyle);
  const [speed, setSpeed] = useState(initialSpeed);
  const [displaySeconds, setDisplaySeconds] = useState(initialDisplaySeconds);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [snapshot, setSnapshot] = useState(initial);
  const [style, setStyle] = useState(initialStyle);
  const [open, setOpen] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);
  const readChanges = useRef(new Map<string, boolean>());
  const readOperations = useRef(new Map<string, number>());
  const revision = useRef(0);
  const mergeReads = useCallback((next: Snapshot | null) => {
    if (!next) return null;
    const reads = new Set(next.readIds);
    readChanges.current.forEach((isRead, id) => { if (isRead) reads.add(id); else reads.delete(id); });
    return { ...next, readIds: [...reads] };
  }, []);
  const pathname = usePathname();
  useEffect(() => { setPopupStyle(initialPopupStyle); }, [initialPopupStyle]); // eslint-disable-line react-hooks/set-state-in-effect
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
    const operation = ++revision.current;
    ids.forEach(id => { readChanges.current.set(id, true); readOperations.current.set(id, operation); });
    setSnapshot(current => current ? { ...current, readIds: [...new Set([...current.readIds, ...ids])] } : null);
    const remaining = new Set(ids);
    try {
      // Small keepalive requests can finish during navigation without holding up
      // the destination or invalidating its prefetched page.
      for (let offset = 0; offset < ids.length; offset += 200) {
        const batch = ids.slice(offset, offset + 200);
        const response = await fetch("/api/account/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: batch }), keepalive: true, cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message ?? "Notification status could not be saved.");
        batch.forEach(id => remaining.delete(id));
      }
    } catch (error) {
      const rollback = [...remaining].filter(id => readOperations.current.get(id) === operation);
      rollback.forEach(id => readChanges.current.delete(id));
      setSnapshot(current => current ? { ...current, readIds: current.readIds.filter(id => !rollback.includes(id)) } : null);
      throw error;
    } finally {
      revision.current++;
      ids.forEach(id => { if (readOperations.current.get(id) === operation) readOperations.current.delete(id); });
    }
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
  const clearAfterDemoReset = useCallback(() => {
    revision.current++;
    readChanges.current.clear();
    readOperations.current.clear();
    setSnapshot(current => current ? { ...current, notifications: [], readIds: [] } : null);
    setOpen(false);
  }, []);
  const read = new Set(snapshot?.readIds);
  const notifications = snapshot?.readAvailable && snapshot.preferences ? snapshot.notifications.filter(n => notificationIsEnabled(n, snapshot.preferences!)) : [];
  const unread = notifications.filter(n => !read.has(n.id));
  return <Context.Provider value={{ popupStyle, setPopupStyle, supportEnabled: snapshot?.supportEnabled !== false, clearAfterDemoReset, speed, setSpeed, displaySeconds, setDisplaySeconds, enabled, setEnabled, style, setStyle, notifications, unread, open, setOpen, markRead, restoreBanner, bannerHidden, setBannerHidden }}>{children}</Context.Provider>;
}
export function useNotifications() { return useContext(Context); }
