"use client";

import Link from "next/link";
import { revealBelowHeader } from "@/lib/account/landing-position";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type MouseEvent } from "react";
import { getCrewRequestStatus, respondToCrewRequest } from "@/lib/crew/actions";
import { markNotificationsRead } from "@/lib/account/notification-read-actions";
import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { AccountIcon, type AccountIconName } from "./AccountIcon";
import { StatusTicket } from "./StatusTicket";
import { AccountSettingsLandingScroll } from "./AccountSettingsLandingScroll";
import { NotificationsLandingScroll } from "./NotificationsLandingScroll";
import { EntryOutcomeEmailPreference } from "./EntryOutcomeEmailPreference";
import { FavoriteAlertEmailPreference } from "./FavoriteAlertEmailPreference";
import { PurchaseOptionEmailPreference } from "./PurchaseOptionEmailPreference";
import { CrewWinEmailPreference } from "./CrewWinEmailPreference";
import { InAppAlertPreferences } from "./InAppAlertPreferences";
import { NotificationStack } from "./NotificationStack";
import { groupNotifications } from "@/lib/account/notification-groups";
import { notificationDestination, notificationFilter, notificationHref, notificationReturnKey, readNotificationReturn, validNotice, type NotificationReturn } from "@/lib/account/notification-return";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/account/notification-events";
import stripStyles from "./account-status-strip.module.css";
import { notificationIsEnabled, type AccountNotification, type NotificationCategory, type NotificationPreferenceKey, type NotificationPreferences } from "@/lib/account/notifications";
import styles from "./notifications.module.css";
import { useTicketBatches } from "./useTicketBatches";
import { useNotifications } from "@/components/notifications/NotificationProvider";

type FilterKey = "all" | NotificationCategory;
type CrewRequestFeedback = { state: "unconfirmed" | "pending" | "resolved"; message: string };
const groupsPerPage = 12;

const filters = [
  ["all", "All", "all"],
  ["action", "Needs attention", "alert"],
  ["account", "Account", "security"],
  ["activity", "Activity", "active"],
  ["orders", "Orders", "orders"],
  ["crew", "Your Crew", "crew"],
] as const satisfies readonly (readonly [FilterKey, string, AccountIconName])[];

type NotificationOverview = { balanceLabel: string; fundingEnabled: boolean; activity: AccountActivity };

function pendingReadIds(key: string): string[] {
  const value = sessionStorage.getItem(key);
  if (!value) return [];
  if (!value.startsWith("[")) return [value];
  const ids: unknown = JSON.parse(value);
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}
function updatePendingReads(key: string, ids: string[], remove = false) {
  try {
    const current = pendingReadIds(key);
    const next = remove ? current.filter(id => !ids.includes(id)) : [...new Set([...current, ...ids])].slice(-100);
    if (next.length) sessionStorage.setItem(key, JSON.stringify(next));
    else sessionStorage.removeItem(key);
  } catch { /* Saving a read receipt still works without storage. */ }
}

export function NotificationsCenter({ userId, initialFilter = "all", obsoleteFilter = false, initialNotice, supportEnabled = true, supportAvailable = true, notifications: serverNotifications, initialReadIds: serverReadIds, activityAvailable, walletAvailable, crewAvailable, ordersAvailable = true, readAvailable: serverReadAvailable, initialAlertPreferences: serverAlertPreferences = {}, preferencesReadAt: serverPreferencesReadAt, overview, outcomeEmailEnabled, favoriteAlertEmailEnabled, purchaseOptionEmailEnabled, crewWinEmailEnabled }: { userId?: string; initialFilter?: FilterKey; obsoleteFilter?: boolean; initialNotice?: string; supportEnabled?: boolean; supportAvailable?: boolean; notifications: AccountNotification[]; initialReadIds: string[]; activityAvailable: boolean; walletAvailable: boolean; crewAvailable: boolean; ordersAvailable?: boolean; readAvailable: boolean; initialAlertPreferences?: NotificationPreferences | null; preferencesReadAt?: number; overview?: NotificationOverview; outcomeEmailEnabled?: boolean | null; favoriteAlertEmailEnabled?: boolean | null; purchaseOptionEmailEnabled?: boolean | null; crewWinEmailEnabled?: boolean | null }) {
  const notificationContext = useNotifications();
  const live = notificationContext?.liveSnapshot;
  // The header already refreshes this verified snapshot. Reuse it for page
  // counts, rows and read controls without remounting the customer's view.
  const notifications = live ? live.notifications : serverNotifications;
  const initialReadIds = live ? live.readIds : serverReadIds;
  const initialAlertPreferences = live ? live.preferences : serverAlertPreferences;
  const preferencesReadAt = live?.preferencesReadAt ?? serverPreferencesReadAt;
  const readAvailable = live ? live.readAvailable : serverReadAvailable;
  const [filter, setFilter] = useState<FilterKey>(initialFilter);
  useEffect(() => {
    if (!obsoleteFilter) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("filter");
    window.history.replaceState(window.history.state, "", url);
  }, [obsoleteFilter]);
  const [focusedNotice, setFocusedNotice] = useState(initialNotice);
  const focusedReturn = useRef<string | undefined>(undefined);
  const noticeFallback = useRef<HTMLDivElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [savedPreferenceOverrides, setSavedPreferenceOverrides] = useState<Partial<Record<NotificationPreferenceKey, { enabled: boolean; savedAt?: number }>>>({});
  const alertPreferences = useMemo(() => ({
    ...initialAlertPreferences,
    ...Object.fromEntries(Object.entries(savedPreferenceOverrides).map(([key, value]) => [key, value.enabled])),
  }), [initialAlertPreferences, savedPreferenceOverrides]);
  const router = useRouter();
  const [responding, startTransition] = useTransition();
  const [crewFeedback, setCrewFeedback] = useState<Record<string, CrewRequestFeedback>>({});
  const [savingRead, startReadTransition] = useTransition();
  const [crewMessage, setCrewMessage] = useState("");
  const crewTrigger = useRef<HTMLButtonElement | null>(null);
  const crewNotice = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (responding || !crewMessage || !crewTrigger.current) return;
    const trigger = crewTrigger.current;
    crewTrigger.current = null;
    if (document.activeElement !== document.body && document.activeElement !== trigger) return;
    crewNotice.current?.focus({ preventScroll: true });
    if (crewNotice.current) revealBelowHeader(crewNotice.current);
  }, [responding, crewMessage]);
  const [readMessage, setReadMessage] = useState("");
  const [readMessageLocation, setReadMessageLocation] = useState<"top" | "bottom">("top");
  const readTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (savingRead || !readMessage || !readTrigger.current) return;
    const trigger = readTrigger.current;
    readTrigger.current = null;
    if (document.activeElement !== document.body && document.activeElement !== trigger) return;
    const target = trigger.isConnected && !trigger.disabled ? trigger : headingRef.current?.querySelector("h1");
    target?.focus({ preventScroll: true });
    if (target) revealBelowHeader(target);
  }, [readMessage, savingRead]);
  const failedReadKey = userId ? `zero-loss-notification-read-retry:${userId}` : null;
  const [locallyRead, setLocallyRead] = useState<Set<string>>(() => new Set());
  const read = useMemo(() => new Set([...initialReadIds, ...locallyRead]), [initialReadIds, locallyRead]);
  const headingRef = useRef<HTMLElement>(null);
  const alertSettingsLink = useRef<HTMLAnchorElement>(null);
  const atAlertSettings = useRef(false);
  useEffect(() => {
    atAlertSettings.current = window.location.hash === "#alert-settings";
    function restoreAlertFocus() {
      const isSettings = window.location.hash === "#alert-settings";
      const returning = atAlertSettings.current && !isSettings;
      atAlertSettings.current = isSettings;
      if (!returning || window.location.pathname !== "/account/notifications") return;
      requestAnimationFrame(() => {
        const link = alertSettingsLink.current;
        if (!link || window.location.hash === "#alert-settings") return;
        link.focus({ preventScroll: true });
        revealBelowHeader(link);
      });
    }
    window.addEventListener("popstate", restoreAlertFocus);
    return () => window.removeEventListener("popstate", restoreAlertFocus);
  }, []);
  useEffect(() => {
    let interrupted = false;
    function focusIntro() {
      if (!interrupted && window.location.hash === "#notifications-intro") headingRef.current?.querySelector("h1")?.focus({ preventScroll: true });
    }
    const stop = () => { interrupted = true; };
    const frame = requestAnimationFrame(focusIntro);
    const settle = window.setTimeout(focusIntro, 250);
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("keydown", stop);
    const hashChanged = () => { interrupted = false; focusIntro(); };
    window.addEventListener("hashchange", hashChanged);
    return () => {
      cancelAnimationFrame(frame); window.clearTimeout(settle);
      window.removeEventListener("pointerdown", stop); window.removeEventListener("keydown", stop);
      window.removeEventListener("hashchange", hashChanged);
    };
  }, []);
  const scrollFrame = useRef<number | null>(null);
  const preferencesKnown = initialAlertPreferences !== null;
  const enabledNotifications = useMemo(() => notifications.filter(notification => (
    (preferencesKnown || !notification.preferenceKey || Object.hasOwn(alertPreferences, notification.preferenceKey))
      && notificationIsEnabled(notification, alertPreferences)
  )), [notifications, alertPreferences, preferencesKnown]);
  const attentionNotifications = useMemo(() => enabledNotifications.filter(notification => notification.category === "action" || !read.has(notification.id) || notification.id === focusedNotice), [enabledNotifications, read, focusedNotice]);
  const actionCount = enabledNotifications.filter(notification => notification.category === "action").length;
  const unreadCount = enabledNotifications.filter(notification => !read.has(notification.id)).length;
  const visible = useMemo(() => filter === "all" ? enabledNotifications : filter === "action" ? attentionNotifications : enabledNotifications.filter(notification => notification.category === filter), [filter, enabledNotifications, attentionNotifications]);
  const groups = useMemo(() => groupNotifications(visible), [visible]);
  const entryNumbers = useMemo(() => new Map(groupNotifications(enabledNotifications)
    .flatMap(group => group.notifications.map((notice, index) => [notice.id, index + 1] as const))), [enabledNotifications]);
  const { list: listRef, ...batches } = useTicketBatches<HTMLDivElement>(groups.length, groupsPerPage, 0, "expand");
  const focusNewUpdate = useRef<number | null>(null);
  useLayoutEffect(() => {
    const index = focusNewUpdate.current;
    if (index === null || index >= batches.end) return;
    focusNewUpdate.current = null;
    const update = listRef.current?.children[index]?.querySelector("article");
    update?.focus();
  }, [batches.end, listRef]);
  const counts = useMemo(() => Object.fromEntries(filters.map(([key]) => [key, key === "all" ? enabledNotifications.length : key === "action" ? attentionNotifications.length : enabledNotifications.filter(notification => notification.category === key).length])) as Record<FilterKey, number>, [enabledNotifications, attentionNotifications]);
  const readyRewards = overview ? readyWalletRewards(overview.activity) : [];
  const singleReward = !overview?.activity.incomplete && readyRewards.length === 1 ? readyRewards[0] : null;
  const optionsCount = overview?.activity.source === "unavailable" || overview?.activity.incomplete ? null : overview?.activity.activity.filter((item) => item.status === "completion").length;
  const restoreRange = batches.restoreRange;
  const noticeIndex = focusedNotice ? groups.findIndex(group => group.notifications.some(item => item.id === focusedNotice)) : -1;

  const orderNoticePrefix = focusedNotice?.match(/^(order-[a-z0-9_-]+)-(?:payment_confirmed|issuance_pending|fulfilled|exception|cancelled|corrected)$/i)?.[1];
  const currentOrderNotice = orderNoticePrefix ? enabledNotifications.find(item => item.id.startsWith(orderNoticePrefix + "-")) : undefined;
  const supportCaseId = focusedNotice?.match(/^support-([a-f0-9-]{36})-/i)?.[1];
  const movedNotice = focusedNotice && noticeIndex < 0 ? enabledNotifications.find(notice => notice.id === focusedNotice) : undefined;
  const incompleteFeed = !preferencesKnown || !(live?.activityAvailable ?? activityAvailable) || !(live?.walletAvailable ?? walletAvailable) || !(live?.crewAvailable ?? crewAvailable) || !(live?.ordersAvailable ?? ordersAvailable) || (supportEnabled && !(live?.supportAvailable ?? supportAvailable));
  useEffect(() => {
    if (!focusedNotice || focusedReturn.current === focusedNotice) return;
    if (noticeIndex < 0) {
      const frame = requestAnimationFrame(() => {
        if (!noticeFallback.current) return;
        revealBelowHeader(noticeFallback.current);
        noticeFallback.current.focus({ preventScroll: true });
      });
      return () => cancelAnimationFrame(frame);
    }
    if (noticeIndex >= batches.end) {
      restoreRange(0, Math.ceil((noticeIndex + 1) / groupsPerPage) * groupsPerPage);
      return;
    }
    const frame = requestAnimationFrame(() => {
      const link = document.getElementById(`notification-link-${encodeURIComponent(focusedNotice)}`);
      if (!link) return;
      focusedReturn.current = focusedNotice;
      const header = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
      window.scrollTo({ top: Math.max(0, window.scrollY + link.getBoundingClientRect().top - header - 18), behavior: "instant" });
      link.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusedNotice, noticeIndex, batches.end, restoreRange]);
  const restoredView = useRef<string | null>(null);

  useEffect(() => {
    // Retain optimistic receipts until acknowledged, then let newer snapshots own them.
    const acknowledged = new Set(initialReadIds);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocallyRead(current => {
      if (![...current].some(id => acknowledged.has(id))) return current;
      return new Set([...current].filter(id => !acknowledged.has(id)));
    });
  }, [initialReadIds]);

  useEffect(() => {
    if (initialAlertPreferences === null) return;
    // A new verified snapshot can represent a more recent save from another tab.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedPreferenceOverrides(current => {
      const remaining = Object.entries(current).filter(([key, choice]) =>
        (initialAlertPreferences[key as NotificationPreferenceKey] !== false) !== choice.enabled &&
        !(choice.savedAt !== undefined && preferencesReadAt !== undefined && preferencesReadAt > choice.savedAt));
      return remaining.length === Object.keys(current).length ? current : Object.fromEntries(remaining);
    });
  }, [initialAlertPreferences, preferencesReadAt, savedPreferenceOverrides]);

  useLayoutEffect(() => {
    if (!userId) return;
    let firstFrame = 0;
    let secondFrame = 0;
    let filterFocusFrame = 0;
    let interrupted = false;
    const timers: number[] = [];
    function cancelScroll() {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      timers.splice(0).forEach(timer => window.clearTimeout(timer));
    }
    function interrupt() { interrupted = true; cancelScroll(); }
    function restoreView(event?: Event) {
      const viewKey = JSON.stringify([userId, window.location.href]);
      if (!event && restoredView.current === viewKey) return;
      restoredView.current = viewKey;
      const returningToFilter = !new URLSearchParams(window.location.search).has("notice")
        && window.location.hash === "#notification-tickets-filters";
      let saved = readNotificationReturn(window.history.state, userId!, window.location.href);
      if (!saved) try {
        const key = `zero-loss-notification-view:${userId}:${new URL(window.location.href).searchParams.get("filter") ?? "all"}`;
        saved = readNotificationReturn(JSON.parse(sessionStorage.getItem(key) ?? "null"), userId!, window.location.href);
      } catch { /* The default feed remains available. */ }
      if (!saved) {
        if (returningToFilter && event?.type === "popstate") {
          cancelAnimationFrame(filterFocusFrame);
          filterFocusFrame = requestAnimationFrame(() => {
            if (document.activeElement === document.body) {
              document.querySelector<HTMLElement>('#notification-tickets-filters [aria-pressed="true"]')?.focus({ preventScroll: true });
            }
          });
        }
        if (event?.type === "popstate") {
          const query = new URLSearchParams(window.location.search);
          setFilter(notificationFilter(query.get("filter")));
          const notice = query.get("notice");
          setFocusedNotice(validNotice(notice) ? notice : undefined);
          restoreRange(0, groupsPerPage);
        }
        return;
      }
      setFilter(saved.filter);
      setExpandedGroups(saved.expandedGroups);
      restoreRange(saved.start, saved.size);
      cancelScroll();
      interrupted = false;
      const align = () => {
        if (interrupted || window.location.href !== saved.href) return;
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
        firstFrame = requestAnimationFrame(() => {
          secondFrame = requestAnimationFrame(() => {
            if (interrupted || window.location.href !== saved.href) return;
            const list = listRef.current;
            if (list) list.scrollTop = saved.listScrollTop;
            const link = document.getElementById(saved.linkId);
            const top = link && list?.contains(link) ? window.scrollY + link.getBoundingClientRect().top - saved.linkTop : saved.scrollY;
            window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
            if (returningToFilter && !saved.linkId) {
              const filter = document.querySelector<HTMLElement>('#notification-tickets-filters [aria-pressed="true"]');
              const active = document.activeElement;
              if (active !== document.body && active?.id !== "main-content" && active !== filter) return;
              const header = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
              const visible = (element: HTMLElement) => {
                const box = element.getBoundingClientRect();
                return box.top >= header && box.top < window.innerHeight;
              };
              const update = Array.from(list?.querySelectorAll<HTMLElement>("article[tabindex]") ?? []).find(visible);
              (filter && visible(filter) ? filter : update)?.focus({ preventScroll: true });
            }
          });
        });
      };
      align();
      // Back navigation and the sticky header can settle after the first paint.
      // Never keep correcting position once the customer starts interacting.
      for (const delay of [150, 400, 900]) timers.push(window.setTimeout(align, delay));
    }
    restoreView();
    window.addEventListener("popstate", restoreView);
    window.addEventListener("pageshow", restoreView);
    window.addEventListener("pointerdown", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("keydown", interrupt);
    return () => {
      cancelScroll();
      cancelAnimationFrame(filterFocusFrame);
      window.removeEventListener("popstate", restoreView);
      window.removeEventListener("pageshow", restoreView);
      window.removeEventListener("pointerdown", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("keydown", interrupt);
    };
  }, [userId, restoreRange, listRef]);

  useEffect(() => () => {
    if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current);
  }, []);

  function updateBookmark(changes: Partial<NotificationReturn>) {
    if (!userId) return;
    const saved = readNotificationReturn(window.history.state, userId, window.location.href);
    const updated = { [notificationReturnKey]: {
      ...saved, userId, href: window.location.href, filter, start: batches.start, size: batches.size, expandedGroups,
      scrollY: window.scrollY, listScrollTop: listRef.current?.scrollTop ?? 0,
      linkId: "", linkTop: 0, ...changes,
    } };
    window.history.replaceState({ ...window.history.state, ...updated }, "");
    try { sessionStorage.setItem(`zero-loss-notification-view:${userId}:${filter}`, JSON.stringify(updated)); } catch { /* History remains usable. */ }
  }

  function clearExactNotice() {
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    url.hash = "notification-tickets-filters";
    window.history.replaceState(window.history.state, "", url);
    setFocusedNotice(undefined);
  }

  function selectFilter(nextFilter: FilterKey, focusFilter = false) {
    const url = new URL(window.location.href);
    if (nextFilter === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", nextFilter);
    url.searchParams.delete("notice");
    url.hash = "notification-tickets-filters";
    const state = { ...window.history.state };
    const saved = userId ? readNotificationReturn(state, userId, window.location.href) : null;
    if (saved) state[notificationReturnKey] = { ...saved, href: url.href, filter: nextFilter, start: 0, size: groupsPerPage, listScrollTop: 0, linkId: "", linkTop: 0 };
    if (url.href !== window.location.href) window.history.pushState(state, "", url);
    atAlertSettings.current = false;
    setFilter(nextFilter);
    setFocusedNotice(undefined);
    batches.reset();
    if (!focusFilter && !window.matchMedia?.("(max-width: 620px)").matches) return;
    if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = window.requestAnimationFrame(() => {
      scrollFrame.current = null;
      if (focusFilter) {
        const selected = document.querySelector<HTMLElement>('#notification-tickets-filters [aria-pressed="true"]');
        selected?.focus({ preventScroll: true });
        if (selected) revealBelowHeader(selected);
        return;
      }
      const heading = headingRef.current;
      if (!heading) return;
      const stickyHeaderBottom = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
      const top = window.scrollY + heading.getBoundingClientRect().top - stickyHeaderBottom - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    });
  }

  async function saveRead(ids: string[]) {
    try { const result = await markNotificationsRead(ids); if (result.ok) window.dispatchEvent(new Event("zero-loss-notifications-read")); return result; }
    catch { return { ok: false, message: "We couldn’t save your notification status. Please try again." }; }
  }

  const [queuedReadError, setQueuedReadError] = useState("");
  const [queuedReadAttempt, setQueuedReadAttempt] = useState(0);
  const [retryingQueuedReads, setRetryingQueuedReads] = useState(false);
  const queuedReadButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!failedReadKey || !readAvailable) return;
    let active = true;
    async function retryQueuedReads(key: string) {
      try {
        const ids = pendingReadIds(key);
        if (ids.length) {
          const result = await markNotificationsRead(ids);
          if (!active) return;
          if (!result.ok) { setQueuedReadError(result.message); return; }
          updatePendingReads(key, ids, true);
          setLocallyRead(previous => new Set([...previous, ...ids]));
          window.dispatchEvent(new Event("zero-loss-notifications-read"));
        }
        if (!active) return;
        if (queuedReadButton.current && document.activeElement === queuedReadButton.current) {
          const heading = headingRef.current?.querySelector("h1");
          heading?.focus({ preventScroll: true });
          if (heading) revealBelowHeader(heading);
        }
        setQueuedReadError("");
      } catch {
        if (active) setQueuedReadError("We couldn’t save that notification’s read status.");
      } finally {
        if (active) setRetryingQueuedReads(false);
      }
    }
    void retryQueuedReads(failedReadKey);
    return () => { active = false; };
  }, [failedReadKey, readAvailable, queuedReadAttempt]);

  function updateCrewRequest(id: string, trigger: HTMLButtonElement, accept?: boolean) {
    crewTrigger.current = trigger;
    setCrewMessage("");
    startTransition(async () => {
      let feedback: CrewRequestFeedback;
      if (accept !== undefined) {
        const result = await respondToCrewRequest(id, accept).catch(() => null);
        feedback = result?.ok
          ? { state: "resolved", message: result.message }
          : { state: "unconfirmed", message: "We couldn’t confirm your response. Check the request status before trying again." };
      } else {
        const status = await getCrewRequestStatus(id).catch(() => null);
        switch (status) {
          case null:
            feedback = { state: "unconfirmed", message: "We couldn’t check this request. Check your connection and try again." };
            break;
          case "pending":
            feedback = { state: "pending", message: "This request is still pending. You can respond now." };
            break;
          default:
            feedback = {
              state: "resolved",
              message: status === "accepted" ? "This Crew request was already approved."
                : status === "declined" ? "This Crew request was already declined."
                : "This Crew request is no longer available.",
            };
        }
      }
      setCrewFeedback(current => ({ ...current, [id]: feedback }));
      if (feedback.state === "resolved") {
        setCrewMessage(feedback.message);
        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
        router.refresh();
      }
    });
  }

  function markAllRead(trigger: HTMLButtonElement, location: "top" | "bottom") {
    const ids = enabledNotifications.map((notification) => notification.id).filter((id) => !read.has(id));
    if (!ids.length || !readAvailable) return;
    setReadMessage("");
    setReadMessageLocation(location);
    readTrigger.current = trigger;
    setLocallyRead((previous) => new Set([...previous, ...ids]));
    startReadTransition(async () => {
      const failed: string[] = [];
      let message = "";
      for (let start = 0; start < ids.length; start += 200) {
        const batch = ids.slice(start, start + 200);
        const result = await saveRead(batch);
        if (!result.ok) { failed.push(...batch); message = result.message; }
      }
      if (failed.length) {
        setLocallyRead((previous) => {
          const next = new Set(previous);
          failed.forEach((id) => next.delete(id));
          return next;
        });
        setReadMessage(message);
      } else setReadMessage(incompleteFeed ? "Loaded updates marked as read. More updates may still be unread." : "All notifications marked as read.");
    });
  }

  function openNotification(notification: AccountNotification, destination: string) {
    setLocallyRead((previous) => new Set(previous).add(notification.id));
    if (failedReadKey) updatePendingReads(failedReadKey, [notification.id]);
    // The optional read receipt must not hold up the customer's destination.
    router.push(destination);
    startReadTransition(async () => {
      const result = await saveRead([notification.id]);
      if (result.ok && failedReadKey) {
        updatePendingReads(failedReadKey, [notification.id], true);
      }
      if (!result.ok) {
        setLocallyRead((previous) => {
          const next = new Set(previous);
          next.delete(notification.id);
          return next;
        });
      }
    });
  }

  function handleNotificationClick(event: MouseEvent<HTMLAnchorElement>, notification: AccountNotification) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (userId) {
      const saved: NotificationReturn = {
        userId, href: window.location.href, filter, start: batches.start, size: batches.size, expandedGroups,
        scrollY: window.scrollY, listScrollTop: listRef.current?.scrollTop ?? 0,
        linkId: event.currentTarget.id, linkTop: event.currentTarget.getBoundingClientRect().top,
      };
      // Preserve Next's state and the exact destination without another Back step.
      window.history.replaceState({ ...window.history.state, [notificationReturnKey]: saved }, "");
    }
    if (!readAvailable || read.has(notification.id)) return;
    event.preventDefault();
    openNotification(notification, event.currentTarget.getAttribute("href") ?? notification.href);
  }

  if (notificationContext?.sessionExpired) return <div className={styles.page}>
    <h1>Notifications</h1>
    <p role="status">Your session ended. Sign in to see your updates.</p>
    <Link href="/login?next=%2Faccount%2Fnotifications">Sign in</Link>
  </div>;
  return <div className={styles.page}>
    <NotificationsLandingScroll userId={userId} />
    <div className={styles.pageContent}>
      {overview ? <div className={stripStyles.row} aria-label="Your account overview">
        <StatusTicket variant="wallet" size="top" label="Playable Wallet" value={overview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={overview.fundingEnabled ? `${walletHistoryHref}&panel=funding#add-funds` : undefined} actionDisabled={!overview.fundingEnabled} />
        <StatusTicket variant="reward" size="top" label="Prize Ready" value={overview.activity.source === "unavailable" || overview.activity.incomplete ? "Unavailable" : String(readyRewards.length)} action={singleReward ? "View reward" : "View rewards"} href={singleReward ? walletRewardHref(singleReward) : accountRoutes.rewards} />
        <StatusTicket variant="option" size="top" label="Purchase Options" value={optionsCount === null || optionsCount === undefined ? "Unavailable" : String(optionsCount)} action="Continue with Purchase" href={accountRoutes.purchaseOptions} />
      </div> : null}
      {obsoleteFilter && filter === "all" ? <p role="status" className="mb-3 text-sm font-semibold text-amber-200">That notification filter is unavailable. Showing all updates.</p> : null}
      <header id="notifications-intro" ref={headingRef} className={styles.header}>
        <div><h1 tabIndex={-1}>Notifications</h1><p>The updates that need your attention.</p></div>
        <div className={styles.headerActions}>
          <button type="button" onClick={event => markAllRead(event.currentTarget, "top")} disabled={enabledNotifications.length === 0 || enabledNotifications.every((notification) => read.has(notification.id)) || savingRead || !readAvailable}>
            <AccountIcon name="mail" /> Mark all as read
          </button>
          <a ref={alertSettingsLink} href="#alert-settings" onClick={event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const heading = document.getElementById("in-app-alert-heading");
            if (!heading) return;
            event.preventDefault();
            if (window.location.hash !== "#alert-settings") window.history.pushState(window.history.state, "", "#alert-settings");
            atAlertSettings.current = true;
            heading.focus({ preventScroll: true });
            revealBelowHeader(heading);
          }}><AccountIcon name="settings" /> Alert settings</a>
        </div>
      </header>

      {incompleteFeed || !readAvailable ? <p role="status" className={styles.sourceWarning}>Some account updates could not be verified right now. Only confirmed information is shown.</p> : null}
      {focusedNotice && noticeIndex < 0 ? <div ref={noticeFallback} tabIndex={-1} role="status" className={styles.sourceWarning}>
        {movedNotice ? <>This update is outside the selected filter. <Link href={notificationHref(movedNotice.category, movedNotice.id)}>Open this update in {filters.find(([key]) => key === movedNotice.category)?.[1]}</Link></> : currentOrderNotice ? <>This order has a newer update. <Link href={notificationHref(currentOrderNotice.category, currentOrderNotice.id)}>Open the current update</Link></> : supportCaseId ? <>This update may have moved out of the recent feed. <Link href={`/support?case=${supportCaseId}#conversation`}>Check this support case</Link></> : incompleteFeed ? "We couldn’t verify this update right now. Try refreshing this page." : "This update is no longer available. Your current updates are below."}
      </div> : null}
      {crewMessage ? <p ref={crewNotice} tabIndex={-1} role="status" className={styles.sourceWarning}>{crewMessage}</p> : null}
      {readMessage && readMessageLocation === "top" ? <p role="status" className={styles.sourceWarning}>{readMessage}</p> : null}
      {queuedReadError ? <p role="status" className={styles.sourceWarning}>{queuedReadError} <button className="font-bold underline" ref={queuedReadButton} type="button" aria-disabled={retryingQueuedReads || !readAvailable || undefined} onClick={() => {
        if (retryingQueuedReads || !readAvailable) return;
        setRetryingQueuedReads(true);
        setQueuedReadAttempt(attempt => attempt + 1);
      }}>{retryingQueuedReads ? "Trying again…" : "Try again"}</button></p> : null}
      {counts.action > 0 ? <button type="button" className={styles.actionShortcut} onClick={() => selectFilter("action", true)}><AccountIcon name="alert" /> <strong>{actionCount} {actionCount === 1 ? "action" : "actions"} needed · {unreadCount} unread {unreadCount === 1 ? "update" : "updates"}</strong><span>See what needs your attention</span><AccountIcon name="arrow" /></button> : null}

      <div className={styles.layout}>
        <nav id="notification-tickets-filters" aria-label="Notification filters" className={styles.filters}>
          {filters.map(([key, label, icon]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => selectFilter(key)}>
            <AccountIcon name={icon} />
            <span>{label}</span>
            <strong>{counts[key]}</strong>
          </button>)}
        </nav>

        <section aria-live="polite" aria-label={`${filters.find(([key]) => key === filter)?.[1]} notifications`} className={styles.list}>
          {visible.length === 0 ? <div className={styles.empty}>
            <span aria-hidden="true"><AccountIcon name={filter === "orders" ? "orders" : "bell"} /></span>
            <h2>{filter === "all" ? "No notifications" : filter === "action" ? "Nothing needs attention" : filter === "orders" ? "No order updates" : filter === "crew" ? "No Crew updates yet." : `No ${filters.find(([key]) => key === filter)?.[1].toLowerCase()} updates`}</h2>
            <p>New verified updates will appear here automatically.</p>
          </div> : <div id="notification-tickets" ref={listRef} tabIndex={-1} className={`${styles.list} ${styles.notificationRows}`}>{groups.slice(0, batches.end).map(group => {
            const notification = group.notifications[0];
            const requestId = notification.crewRequestId;
            const feedback = requestId ? crewFeedback[requestId] : undefined;
            return <NotificationStack key={group.key} group={group} read={read} entryNumbers={entryNumbers} categoryLabel={filters.find(([key]) => key === notification.category)?.[1] ?? ""} onOpen={handleNotificationClick} destination={item => notificationDestination(item, filter)}
              expanded={expandedGroups.includes(group.key) || (focusedNotice !== undefined && group.notifications.some(item => item.id === focusedNotice))} onExpandedChange={expanded => {
                if (!expanded && group.notifications.some(item => item.id === focusedNotice)) clearExactNotice();
                const next = expanded ? [...expandedGroups, group.key] : expandedGroups.filter(key => key !== group.key);
                updateBookmark({ expandedGroups: next }); setExpandedGroups(next);
              }}>
              {requestId && feedback?.state !== "resolved" ? <>
                <div className={styles.crewActions}>
                  {feedback?.state === "unconfirmed" ? <button type="button" disabled={responding} onClick={event => updateCrewRequest(requestId, event.currentTarget)}>Check request status</button> : <>
                    <button type="button" disabled={responding} onClick={event => updateCrewRequest(requestId, event.currentTarget, true)}>Approve</button>
                    <button type="button" disabled={responding} onClick={event => updateCrewRequest(requestId, event.currentTarget, false)}>Decline</button>
                  </>}
                </div>
                {feedback ? <p role={feedback.state === "unconfirmed" ? "alert" : "status"} className={styles.body}>{feedback.message}</p> : null}
              </> : null}
            </NotificationStack>;
          })}</div>}
          {visible.length > 0 && <div className={styles.listActions}>
            {batches.remaining > 0 && <button type="button" aria-controls="notification-tickets" aria-expanded={batches.expanded} className={styles.showMore} onClick={() => {
              focusNewUpdate.current = batches.end;
              updateBookmark({ start: batches.end }); batches.more();
            }}>See more updates ({batches.remaining} remaining)</button>}
            <button type="button" onClick={event => markAllRead(event.currentTarget, "bottom")} disabled={unreadCount === 0 || savingRead || !readAvailable}>{savingRead ? "Saving…" : "Mark All as Read"}</button>
            {(batches.expanded || batches.size > groupsPerPage) && <button type="button" aria-controls="notification-tickets" aria-expanded onClick={() => {
              if (focusedNotice) clearExactNotice();
              updateBookmark({ start: 0, size: groupsPerPage, listScrollTop: 0 });
              batches.reset();
              listRef.current?.focus({ preventScroll: true });
              listRef.current?.scrollIntoView?.({ block: "start", behavior: "auto" });
            }}>Close</button>}
          </div>}
          {readMessage && readMessageLocation === "bottom" && <p role="status" className={styles.sourceWarning}>{readMessage}</p>}
        </section>
      </div>
      <AccountSettingsLandingScroll target="alert-settings" focusTarget="in-app-alert-heading" allScreens restrictToTargetHash />
      <AccountSettingsLandingScroll target="email-preferences" focusTarget="outcome-email-heading" allScreens restrictToTargetHash />
      <AccountSettingsLandingScroll target="email-choices" focusTarget="email-choices" allScreens restrictToTargetHash />
      <div id="alert-settings" className={styles.settingsBlock}>
        <InAppAlertPreferences supportEnabled={supportEnabled} initialPreferences={initialAlertPreferences === null ? null : alertPreferences} onSaved={(key, enabled, savedAt) => setSavedPreferenceOverrides(current => ({ ...current, [key]: { enabled, savedAt } }))} />
        <Link href="/account/crew?tab=privacy#crew-privacy" className={styles.sharingLink}>Sharing preferences <AccountIcon name="arrow" /></Link>
        <h2 id="email-choices" tabIndex={-1}>Email choices</h2>
        <p>These controls affect email only; the in-app choices above affect this notification list.</p>
        {outcomeEmailEnabled !== undefined ? <EntryOutcomeEmailPreference initialEnabled={outcomeEmailEnabled} placement="account" /> : null}
        {favoriteAlertEmailEnabled !== undefined ? <FavoriteAlertEmailPreference initialEnabled={favoriteAlertEmailEnabled} /> : null}
        {purchaseOptionEmailEnabled !== undefined ? <PurchaseOptionEmailPreference initialEnabled={purchaseOptionEmailEnabled} /> : null}
        {crewWinEmailEnabled !== undefined ? <CrewWinEmailPreference initialEnabled={crewWinEmailEnabled} /> : null}
      </div>
      <p className={styles.footerNote}>SHOPPING SHOULD NEVER FEEL LIKE A LOSS.</p>
    </div>
  </div>;
}
