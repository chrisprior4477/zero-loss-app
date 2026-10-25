"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type MouseEvent } from "react";
import { respondToCrewRequest } from "@/lib/crew/actions";
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
import stripStyles from "./account-status-strip.module.css";
import { notificationIsEnabled, type AccountNotification, type NotificationCategory, type NotificationPreferenceKey, type NotificationPreferences } from "@/lib/account/notifications";
import styles from "./notifications.module.css";

type FilterKey = "all" | NotificationCategory;
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

export function NotificationsCenter({ supportEnabled = true, notifications, initialReadIds, activityAvailable, walletAvailable, crewAvailable, ordersAvailable = true, readAvailable, initialAlertPreferences = {}, overview, outcomeEmailEnabled, favoriteAlertEmailEnabled, purchaseOptionEmailEnabled, crewWinEmailEnabled }: { supportEnabled?: boolean; notifications: AccountNotification[]; initialReadIds: string[]; activityAvailable: boolean; walletAvailable: boolean; crewAvailable: boolean; ordersAvailable?: boolean; readAvailable: boolean; initialAlertPreferences?: NotificationPreferences | null; overview?: NotificationOverview; outcomeEmailEnabled?: boolean | null; favoriteAlertEmailEnabled?: boolean | null; purchaseOptionEmailEnabled?: boolean | null; crewWinEmailEnabled?: boolean | null }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [shownGroups, setShownGroups] = useState(groupsPerPage);
  const [alertPreferences, setAlertPreferences] = useState<NotificationPreferences>(initialAlertPreferences ?? {});
  const router = useRouter();
  const [responding, startTransition] = useTransition();
  const [savingRead, startReadTransition] = useTransition();
  const [crewMessage, setCrewMessage] = useState("");
  const [readMessage, setReadMessage] = useState("");
  const [read, setRead] = useState<Set<string>>(() => new Set(initialReadIds));
  const headingRef = useRef<HTMLElement>(null);
  const scrollFrame = useRef<number | null>(null);
  const enabledNotifications = useMemo(() => notifications.filter(notification => notificationIsEnabled(notification, alertPreferences)), [notifications, alertPreferences]);
  const visible = useMemo(() => filter === "all" ? enabledNotifications : enabledNotifications.filter(notification => notification.category === filter), [filter, enabledNotifications]);
  const groups = useMemo(() => groupNotifications(visible), [visible]);
  const counts = useMemo(() => Object.fromEntries(filters.map(([key]) => [key, key === "all" ? enabledNotifications.length : enabledNotifications.filter(notification => notification.category === key).length])) as Record<FilterKey, number>, [enabledNotifications]);
  const readyRewards = overview ? readyWalletRewards(overview.activity) : [];
  const singleReward = readyRewards.length === 1 ? readyRewards[0] : null;
  const optionsCount = overview?.activity.source === "unavailable" ? null : overview?.activity.activity.filter((item) => item.status === "completion").length;

  useEffect(() => () => {
    if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current);
  }, []);

  function selectFilter(nextFilter: FilterKey) {
    setFilter(nextFilter);
    setShownGroups(groupsPerPage);
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

  function markAllRead() {
    const ids = enabledNotifications.map((notification) => notification.id).filter((id) => !read.has(id));
    if (!ids.length || !readAvailable) return;
    setReadMessage("");
    setRead((previous) => new Set([...previous, ...ids]));
    startReadTransition(async () => {
      const result = await saveRead(ids);
      if (!result.ok) {
        setRead((previous) => {
          const next = new Set(previous);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        setReadMessage(result.message);
      }
    });
  }

  function openNotification(notification: AccountNotification) {
    setRead((previous) => new Set(previous).add(notification.id));
    startReadTransition(async () => {
      const result = await saveRead([notification.id]);
      if (!result.ok) {
        setRead((previous) => {
          const next = new Set(previous);
          next.delete(notification.id);
          return next;
        });
      }
      router.push(notification.href);
    });
  }

  function handleNotificationClick(event: MouseEvent<HTMLAnchorElement>, notification: AccountNotification) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      || !readAvailable || read.has(notification.id)) return;
    event.preventDefault();
    openNotification(notification);
  }

  return <div className={styles.page}>
    <NotificationsLandingScroll />
    <div className={styles.pageContent}>
      {overview ? <div className={stripStyles.row} aria-label="Your account overview">
        <StatusTicket variant="wallet" size="top" label="Playable Wallet" value={overview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={overview.fundingEnabled ? `${walletHistoryHref}#add-funds` : undefined} actionDisabled={!overview.fundingEnabled} />
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
        <nav aria-label="Notification filters" className={styles.filters}>
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
          </div> : groups.slice(0, shownGroups).map(group => {
            const notification = group.notifications[0];
            return <NotificationStack key={group.key} group={group} read={read} categoryLabel={filters.find(([key]) => key === notification.category)?.[1] ?? ""} onOpen={handleNotificationClick}>
              {notification.crewRequestId ? <div className={styles.crewActions}>
                <button type="button" disabled={responding} onClick={() => startTransition(async () => { const result = await respondToCrewRequest(notification.crewRequestId!, true); setCrewMessage(result.message); if (result.ok) router.refresh(); })}>Approve</button>
                <button type="button" disabled={responding} onClick={() => startTransition(async () => { const result = await respondToCrewRequest(notification.crewRequestId!, false); setCrewMessage(result.message); if (result.ok) router.refresh(); })}>Decline</button>
              </div> : null}
            </NotificationStack>;
          })}
          {shownGroups < groups.length ? <button type="button" className={styles.showMore} onClick={() => setShownGroups(current => current + groupsPerPage)}>Show more updates ({groups.length - shownGroups} remaining)<AccountIcon name="arrow" /></button> : null}
        </section>
      </div>
      <div id="alert-settings" className={styles.settingsBlock}>
        <InAppAlertPreferences supportEnabled={supportEnabled} initialPreferences={initialAlertPreferences} onSaved={(key: NotificationPreferenceKey, enabled: boolean) => setAlertPreferences(current => ({ ...current, [key]: enabled }))} />
        <Link href="/account/crew?tab=picks#sharing" className={styles.sharingLink}>Sharing preferences <AccountIcon name="arrow" /></Link>
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
