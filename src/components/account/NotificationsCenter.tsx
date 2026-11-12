"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type MouseEvent } from "react";
import { getCrewRequestStatus, respondToCrewRequest } from "@/lib/crew/actions";
import { markNotificationsRead } from "@/lib/account/notification-read-actions";
import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { AccountIcon, type AccountIconName } from "./AccountIcon";
import { StatusTicket } from "./StatusTicket";
import { NotificationsLandingScroll } from "./NotificationsLandingScroll";
import { EntryOutcomeEmailPreference } from "./EntryOutcomeEmailPreference";
import { FavoriteAlertEmailPreference } from "./FavoriteAlertEmailPreference";
import { PurchaseOptionEmailPreference } from "./PurchaseOptionEmailPreference";
import { CrewWinEmailPreference } from "./CrewWinEmailPreference";
import { InAppAlertPreferences } from "./InAppAlertPreferences";
import { NotificationStack } from "./NotificationStack";
import { groupNotifications } from "@/lib/account/notification-groups";
import { notificationReturnKey, readNotificationReturn, type NotificationReturn } from "@/lib/account/notification-return";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/account/notification-events";
import stripStyles from "./account-status-strip.module.css";
import { notificationIsEnabled, type AccountNotification, type NotificationCategory, type NotificationPreferenceKey, type NotificationPreferences } from "@/lib/account/notifications";
import styles from "./notifications.module.css";
import { useTicketBatches } from "./useTicketBatches";
import { TicketBatchControls } from "./TicketBatchControls";
import batchStyles from "./ticket-batches.module.css";
import { useNotifications } from "@/components/notifications/NotificationProvider";

type FilterKey = "all" | NotificationCategory;
type CrewRequestFeedback = { state: "unconfirmed" | "pending" | "resolved"; message: string };
const groupsPerPage = 12;

const filters = [
  ["all", "All", "all"],
  ["action", "Action needed", "alert"],
  ["account", "Account", "security"],
  ["activity", "Activity", "active"],
  ["orders", "Orders", "orders"],
  ["crew", "Your Crew", "crew"],
] as const satisfies readonly (readonly [FilterKey, string, AccountIconName])[];

type NotificationOverview = { balanceLabel: string; fundingEnabled: boolean; activity: AccountActivity };

export function NotificationsCenter({ userId, supportEnabled = true, notifications: serverNotifications, initialReadIds: serverReadIds, activityAvailable, walletAvailable, crewAvailable, ordersAvailable = true, readAvailable: serverReadAvailable, initialAlertPreferences: serverAlertPreferences = {}, overview, outcomeEmailEnabled, favoriteAlertEmailEnabled, purchaseOptionEmailEnabled, crewWinEmailEnabled }: { userId?: string; supportEnabled?: boolean; notifications: AccountNotification[]; initialReadIds: string[]; activityAvailable: boolean; walletAvailable: boolean; crewAvailable: boolean; ordersAvailable?: boolean; readAvailable: boolean; initialAlertPreferences?: NotificationPreferences | null; overview?: NotificationOverview; outcomeEmailEnabled?: boolean | null; favoriteAlertEmailEnabled?: boolean | null; purchaseOptionEmailEnabled?: boolean | null; crewWinEmailEnabled?: boolean | null }) {
  const live = useNotifications()?.liveSnapshot;
  // The header already refreshes this verified snapshot. Reuse it for page
  // counts, rows and read controls without remounting the customer's view.
  const notifications = live ? live.notifications : serverNotifications;
  const initialReadIds = live ? live.readIds : serverReadIds;
  const initialAlertPreferences = live ? live.preferences : serverAlertPreferences;
  const readAvailable = live ? live.readAvailable : serverReadAvailable;
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [savedPreferenceOverrides, setSavedPreferenceOverrides] = useState<NotificationPreferences>({});
  const alertPreferences = useMemo(() => ({ ...initialAlertPreferences, ...savedPreferenceOverrides }), [initialAlertPreferences, savedPreferenceOverrides]);
  const router = useRouter();
  const [responding, startTransition] = useTransition();
  const [crewFeedback, setCrewFeedback] = useState<Record<string, CrewRequestFeedback>>({});
  const [savingRead, startReadTransition] = useTransition();
  const [crewMessage, setCrewMessage] = useState("");
  const [readMessage, setReadMessage] = useState("");
  const [locallyRead, setLocallyRead] = useState<Set<string>>(() => new Set());
  const read = useMemo(() => new Set([...initialReadIds, ...locallyRead]), [initialReadIds, locallyRead]);
  const headingRef = useRef<HTMLElement>(null);
  const scrollFrame = useRef<number | null>(null);
  const enabledNotifications = useMemo(() => notifications.filter(notification => notificationIsEnabled(notification, alertPreferences)), [notifications, alertPreferences]);
  const visible = useMemo(() => filter === "all" ? enabledNotifications : enabledNotifications.filter(notification => notification.category === filter), [filter, enabledNotifications]);
  const groups = useMemo(() => groupNotifications(visible), [visible]);
  const { list: listRef, ...batches } = useTicketBatches<HTMLDivElement>(groups.length, groupsPerPage);
  const counts = useMemo(() => Object.fromEntries(filters.map(([key]) => [key, key === "all" ? enabledNotifications.length : enabledNotifications.filter(notification => notification.category === key).length])) as Record<FilterKey, number>, [enabledNotifications]);
  const readyRewards = overview ? readyWalletRewards(overview.activity) : [];
  const singleReward = readyRewards.length === 1 ? readyRewards[0] : null;
  const optionsCount = overview?.activity.source === "unavailable" ? null : overview?.activity.activity.filter((item) => item.status === "completion").length;
  const restoreRange = batches.restoreRange;
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
    // Discard only overrides the server has acknowledged. An older refresh must
    // not reverse a successful local choice while its fresh response is arriving.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedPreferenceOverrides(current => {
      const remaining = Object.entries(current).filter(([key, enabled]) => (initialAlertPreferences[key as NotificationPreferenceKey] !== false) !== enabled);
      return remaining.length === Object.keys(current).length ? current : Object.fromEntries(remaining);
    });
  }, [initialAlertPreferences, savedPreferenceOverrides]);

  useLayoutEffect(() => {
    if (!userId) return;
    let firstFrame = 0;
    let secondFrame = 0;
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
      const saved = readNotificationReturn(window.history.state, userId!, window.location.href);
      if (!saved) return;
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
    if (!saved) return;
    window.history.replaceState({ ...window.history.state, [notificationReturnKey]: {
      ...saved, filter, start: batches.start, size: batches.size, expandedGroups,
      scrollY: window.scrollY, listScrollTop: listRef.current?.scrollTop ?? 0,
      linkId: "", linkTop: 0, ...changes,
    } }, "");
  }

  function selectFilter(nextFilter: FilterKey) {
    updateBookmark({ filter: nextFilter, start: 0, size: groupsPerPage, listScrollTop: 0 });
    setFilter(nextFilter);
    batches.reset();
    if (!window.matchMedia?.("(max-width: 620px)").matches) return;
    if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = window.requestAnimationFrame(() => {
      scrollFrame.current = null;
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

  function updateCrewRequest(id: string, accept?: boolean) {
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

  function markAllRead() {
    const ids = enabledNotifications.map((notification) => notification.id).filter((id) => !read.has(id));
    if (!ids.length || !readAvailable) return;
    setReadMessage("");
    setLocallyRead((previous) => new Set([...previous, ...ids]));
    startReadTransition(async () => {
      const result = await saveRead(ids);
      if (!result.ok) {
        setLocallyRead((previous) => {
          const next = new Set(previous);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        setReadMessage(result.message);
      }
    });
  }

  function openNotification(notification: AccountNotification) {
    setLocallyRead((previous) => new Set(previous).add(notification.id));
    // The optional read receipt must not hold up the customer's destination.
    router.push(notification.href);
    startReadTransition(async () => {
      const result = await saveRead([notification.id]);
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
    openNotification(notification);
  }

  return <div className={styles.page}>
    <NotificationsLandingScroll userId={userId} />
    <div className={styles.pageContent}>
      {overview ? <div className={stripStyles.row} aria-label="Your account overview">
        <StatusTicket variant="wallet" size="top" label="Playable Wallet" value={overview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={overview.fundingEnabled ? `${walletHistoryHref}&panel=funding#add-funds` : undefined} actionDisabled={!overview.fundingEnabled} />
        <StatusTicket variant="reward" size="top" label="Prize Ready" value={overview.activity.source === "unavailable" ? "Unavailable" : String(readyRewards.length)} action={singleReward ? "View reward" : "View rewards"} href={singleReward ? walletRewardHref(singleReward) : accountRoutes.rewards} />
        <StatusTicket variant="option" size="top" label="Purchase Options" value={optionsCount === null || optionsCount === undefined ? "Unavailable" : String(optionsCount)} action="Continue with Purchase" href={accountRoutes.purchaseOptions} />
      </div> : null}
      <header id="notifications-intro" ref={headingRef} className={styles.header}>
        <div><h1>Notifications</h1><p>The updates that need your attention.</p></div>
        <div className={styles.headerActions}>
          <button type="button" onClick={markAllRead} disabled={enabledNotifications.length === 0 || enabledNotifications.every((notification) => read.has(notification.id)) || savingRead || !readAvailable}>
            <AccountIcon name="mail" /> Mark all as read
          </button>
          <a href="#alert-settings"><AccountIcon name="settings" /> Alert settings</a>
        </div>
      </header>

      {!activityAvailable || !walletAvailable || !crewAvailable || !ordersAvailable || !readAvailable ? <p role="status" className={styles.sourceWarning}>Some account updates could not be verified right now. Only confirmed information is shown.</p> : null}
      {crewMessage ? <p role="status" className={styles.sourceWarning}>{crewMessage}</p> : null}
      {readMessage ? <p role="status" className={styles.sourceWarning}>{readMessage}</p> : null}
      {counts.action > 0 ? <button type="button" className={styles.actionShortcut} onClick={() => selectFilter("action")}><AccountIcon name="alert" /> <strong>{counts.action} action needed</strong><span>See what needs your attention</span><AccountIcon name="arrow" /></button> : null}

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
            <h2>{filter === "all" ? "No notifications" : filter === "orders" ? "No order updates" : `No ${filters.find(([key]) => key === filter)?.[1].toLowerCase()} updates`}</h2>
            <p>New verified updates will appear here automatically.</p>
          </div> : <div id="notification-tickets" ref={listRef} tabIndex={-1} className={`${styles.list} ${batchStyles.rows}`}>{groups.slice(0, batches.end).map(group => {
            const notification = group.notifications[0];
            const requestId = notification.crewRequestId;
            const feedback = requestId ? crewFeedback[requestId] : undefined;
            return <NotificationStack key={group.key} group={group} read={read} categoryLabel={filters.find(([key]) => key === notification.category)?.[1] ?? ""} onOpen={handleNotificationClick}
              expanded={expandedGroups.includes(group.key)} onExpandedChange={expanded => {
                const next = expanded ? [...expandedGroups, group.key] : expandedGroups.filter(key => key !== group.key);
                updateBookmark({ expandedGroups: next }); setExpandedGroups(next);
              }}>
              {requestId && feedback?.state !== "resolved" ? <>
                <div className={styles.crewActions}>
                  {feedback?.state === "unconfirmed" ? <button type="button" disabled={responding} onClick={() => updateCrewRequest(requestId)}>Check request status</button> : <>
                    <button type="button" disabled={responding} onClick={() => updateCrewRequest(requestId, true)}>Approve</button>
                    <button type="button" disabled={responding} onClick={() => updateCrewRequest(requestId, false)}>Decline</button>
                  </>}
                </div>
                {feedback ? <p role={feedback.state === "unconfirmed" ? "alert" : "status"} className={styles.body}>{feedback.message}</p> : null}
              </> : null}
            </NotificationStack>;
          })}</div>}
          <TicketBatchControls {...batches} listId="notification-tickets" noun="updates" more={() => {
            updateBookmark({ start: batches.end }); batches.more();
          }} close={() => {
            updateBookmark({ start: 0, size: groupsPerPage, listScrollTop: 0 });
            batches.reset();
            listRef.current?.focus({ preventScroll: true });
            listRef.current?.scrollIntoView?.({ block: "start", behavior: "auto" });
          }} />
        </section>
      </div>
      <div id="alert-settings" className={styles.settingsBlock}>
        <InAppAlertPreferences supportEnabled={supportEnabled} initialPreferences={initialAlertPreferences === null ? null : alertPreferences} onSaved={(key: NotificationPreferenceKey, enabled: boolean) => setSavedPreferenceOverrides(current => ({ ...current, [key]: enabled }))} />
        <Link href="/account/crew?tab=privacy#crew-privacy" className={styles.sharingLink}>Sharing preferences <AccountIcon name="arrow" /></Link>
        <h2>Email choices</h2>
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
