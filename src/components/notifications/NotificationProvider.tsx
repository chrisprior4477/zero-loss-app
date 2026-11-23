"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { BannerStyle, NotificationPopupStyle } from "@/lib/account/banner-style";
import { notificationIsEnabled, type AccountNotification, type NotificationPreferences } from "@/lib/account/notifications";
import { restoreNotificationBanner } from "@/lib/account/restore-banner-action";
import { ENTRY_REQUEST_EVENT, type EntryRequest } from "@/lib/entries/request";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/account/notification-events";
type Snapshot = { preferencesReadAt?: number; notifications: AccountNotification[]; readIds: string[]; readAvailable: boolean; preferences: NotificationPreferences | null; supportEnabled?: boolean; ordersAvailable?: boolean; activityAvailable?: boolean; walletAvailable?: boolean; crewAvailable?: boolean; supportAvailable?: boolean };
type Value = { sessionExpired?: boolean; liveSnapshot: Snapshot | null; receiveConfirmed: (notification: AccountNotification, isRead: boolean) => void; preferencesPreviewActive: boolean; setPreferencesPreviewActive: (active: boolean) => void; popupStyle: NotificationPopupStyle; setPopupStyle: (style: NotificationPopupStyle) => void; supportEnabled: boolean; clearAfterDemoReset: () => void; speed: number; setSpeed: (speed: number) => void; displaySeconds: number; setDisplaySeconds: (seconds: number) => void; enabled: boolean; setEnabled: (enabled: boolean) => void; style: BannerStyle; setStyle: (style: BannerStyle) => void; notifications: AccountNotification[]; unread: AccountNotification[]; open: boolean; setOpen: (open: boolean) => void; markRead: (ids: string[]) => Promise<void>; restoreBanner: () => Promise<string>; bannerHidden: boolean; setBannerHidden: (hidden: boolean) => void };
const Context = createContext<Value | null>(null);
export function NotificationProvider({ children, initial, initialStyle, initialEnabled, initialSpeed = 5, initialDisplaySeconds = 6, initialPopupStyle = "rounded" }: { children: ReactNode; initial: Snapshot | null; initialStyle: BannerStyle; initialEnabled: boolean; initialSpeed?: number; initialDisplaySeconds?: number; initialPopupStyle?: NotificationPopupStyle }) {
  // Keep incoming account refreshes from replacing an unsaved live preview.
  const previewActive = useRef(false);
  const [preferencesPreviewActive, setPreviewActive] = useState(false);
  const setPreferencesPreviewActive = useCallback((active: boolean) => { previewActive.current = active; setPreviewActive(active); }, []);
  const confirmedRequests = useRef(new Set<string>());
  const [popupStyle, setPopupStyle] = useState(initialPopupStyle);
  const [speed, setSpeed] = useState(initialSpeed);
  const [displaySeconds, setDisplaySeconds] = useState(initialDisplaySeconds);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [snapshot, setSnapshot] = useState(initial);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [style, setStyle] = useState(initialStyle);
  const [open, setOpen] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);
  const received = useRef(new Map<string, AccountNotification>());
  const readChanges = useRef(new Map<string, boolean>());
  const readOperations = useRef(new Map<string, number>());
  const verifiedReads = useRef(new Set(initial?.readAvailable ? initial.readIds : []));
  const revision = useRef(0);
  const bannerChannel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("zero-loss-notification-banner");
    bannerChannel.current = channel;
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (!Array.isArray(event.data)) return;
      const ids = new Set(event.data.filter((id): id is string => typeof id === "string"));
      revision.current++;
      ids.forEach(id => verifiedReads.current.delete(id));
      ids.forEach(id => { readOperations.current.delete(id); readChanges.current.delete(id); });
      setSnapshot(snapshot => snapshot ? { ...snapshot, readIds: snapshot.readIds.filter(id => !ids.has(id)) } : null);
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    };
    return () => { bannerChannel.current = null; channel.close(); };
  }, []);
  const mergeReads = useCallback((next: Snapshot | null) => {
    if (!next) return null;
    const reads = new Set(next.readIds);
    readChanges.current.forEach((isRead, id) => { if (isRead) reads.add(id); else reads.delete(id); });
    return { ...next, notifications: [...received.current.values(), ...next.notifications.filter(n => !received.current.has(n.id))], readIds: [...reads] };
  }, []);
  const pathname = usePathname();
  useEffect(() => { if (!previewActive.current) setPopupStyle(initialPopupStyle); }, [initialPopupStyle]);
  useEffect(() => { if (!previewActive.current) setSpeed(initialSpeed); }, [initialSpeed]);
  useEffect(() => { if (!previewActive.current) setDisplaySeconds(initialDisplaySeconds); }, [initialDisplaySeconds]);
  useEffect(() => {
    // Merge incoming server snapshots without discarding verified read state.
    if (initial?.readAvailable) verifiedReads.current = new Set(initial.readIds);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(current => mergeReads(initial && {
      ...initial,
      preferences: initial.preferences ?? current?.preferences ?? null,
      preferencesReadAt: initial.preferences ? initial.preferencesReadAt : current?.preferencesReadAt,
      readIds: initial.readAvailable ? initial.readIds : current?.readIds ?? initial.readIds,
      readAvailable: initial.readAvailable || Boolean(current?.readAvailable),
    }));
  }, [initial, mergeReads]);
  useEffect(() => { if (!previewActive.current) setEnabled(initialEnabled); }, [initialEnabled]);
  useEffect(() => { if (!previewActive.current) setStyle(initialStyle); }, [initialStyle]);
  useEffect(() => {
    if (!initial) return;
    const controller = new AbortController();
    let pending = false;
    let queued = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || controller.signal.aborted) return;
      if (pending) { queued = true; return; }
      pending = true;
      const requestedRevision = revision.current;
      try {
        const response = await fetch("/api/account/notifications", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) {
          setSessionExpired(true);
          setSnapshot(null);
          return;
        }
        if (response.ok) {
          setSessionExpired(false);
          const next: Snapshot = await response.json();
          if (requestedRevision !== revision.current) return;
          next.notifications.forEach(n => received.current.delete(n.id));
          const confirmed = new Set(next.readIds);
          if (next.readAvailable) {
            verifiedReads.current = confirmed;
            readChanges.current.forEach((isRead, id) => { if (confirmed.has(id) === isRead) readChanges.current.delete(id); });
          }
          setSnapshot(current => mergeReads({
            ...next,
            preferences: next.preferences ?? current?.preferences ?? null,
            preferencesReadAt: next.preferences ? next.preferencesReadAt : current?.preferencesReadAt,
            readIds: next.readAvailable ? next.readIds : current?.readIds ?? next.readIds,
            readAvailable: next.readAvailable || Boolean(current?.readAvailable),
          }));
        }
      } catch { /* Keep the last verified snapshot when offline. */ }
      finally { pending = false; if (queued) { queued = false; void refresh(); } }
    };
    const onEntry = (event: Event) => {
      const request = (event as CustomEvent<EntryRequest>).detail;
      if (request?.status !== "accepted" || confirmedRequests.current.has(request.requestId)) return;
      confirmedRequests.current.add(request.requestId);
      void refresh();
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("zero-loss-notifications-read", refresh);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    window.addEventListener(ENTRY_REQUEST_EVENT, onEntry);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); window.removeEventListener("zero-loss-notifications-read", refresh); window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh); window.removeEventListener(ENTRY_REQUEST_EVENT, onEntry); document.removeEventListener("visibilitychange", refresh); };
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
        batch.forEach(id => {
          remaining.delete(id);
          if (readOperations.current.get(id) === operation) verifiedReads.current.add(id);
        });
      }
    } catch (error) {
      const rollback = [...remaining].filter(id => readOperations.current.get(id) === operation
        && readChanges.current.get(id) === true && !verifiedReads.current.has(id));
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
    result.ids.forEach(id => {
      verifiedReads.current.delete(id);
      readOperations.current.delete(id);
      readChanges.current.set(id, false);
    });
    setSnapshot(mergeReads(result.snapshot));
    bannerChannel.current?.postMessage(result.ids);
    setEnabled(true);
    setBannerHidden(false);
    // Keep the page visible so the restored animation can be tried immediately.
    setOpen(false);
    return result.message;
  }, [mergeReads]);
  const receiveConfirmed = useCallback((notification: AccountNotification, isRead: boolean) => {
    revision.current++;
    received.current.set(notification.id, notification);
    readChanges.current.set(notification.id, isRead);
    setSnapshot(current => mergeReads(current));
  }, [mergeReads]);
  const clearAfterDemoReset = useCallback(() => {
    revision.current++;
    received.current.clear();
    readChanges.current.clear();
    readOperations.current.clear();
    verifiedReads.current.clear();
    setSnapshot(current => current ? { ...current, notifications: [], readIds: [] } : null);
    setOpen(false);
  }, []);
  const read = new Set(snapshot?.readIds);
  const notifications = snapshot?.readAvailable && snapshot.preferences ? snapshot.notifications.filter(n => notificationIsEnabled(n, snapshot.preferences!)) : [];
  const unread = notifications.filter(n => !n.resolved && !read.has(n.id));
  return <Context.Provider value={{ sessionExpired, liveSnapshot: snapshot, receiveConfirmed, preferencesPreviewActive, setPreferencesPreviewActive, popupStyle, setPopupStyle, supportEnabled: snapshot?.supportEnabled !== false, clearAfterDemoReset, speed, setSpeed, displaySeconds, setDisplaySeconds, enabled, setEnabled, style, setStyle, notifications, unread, open, setOpen, markRead, restoreBanner, bannerHidden, setBannerHidden }}>{children}</Context.Provider>;
}
export function useNotifications() { return useContext(Context); }
