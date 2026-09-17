"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AccountIcon, type AccountIconName } from "./AccountIcon";
import type { AccountNotification, NotificationCategory } from "@/lib/account/notifications";
import styles from "./notifications.module.css";

type FilterKey = "all" | NotificationCategory;

const filters = [
  ["all", "All", "bell"],
  ["action", "Action needed", "completion"],
  ["account", "Account", "security"],
  ["activity", "Activity", "layers"],
  ["orders", "Orders", "orders"],
] as const satisfies readonly (readonly [FilterKey, string, AccountIconName])[];

export function NotificationsCenter({ notifications, activityAvailable, walletAvailable }: { notifications: AccountNotification[]; activityAvailable: boolean; walletAvailable: boolean }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [read, setRead] = useState<Set<string>>(() => new Set());
  const visible = useMemo(() => filter === "all" ? notifications : notifications.filter(notification => notification.category === filter), [filter, notifications]);
  const counts = useMemo(() => Object.fromEntries(filters.map(([key]) => [key, key === "all" ? notifications.length : notifications.filter(notification => notification.category === key).length])) as Record<FilterKey, number>, [notifications]);

  return <div className={styles.page}>
    <div className={styles.pageContent}>
      <header className={styles.header}>
        <div><h1>Notifications</h1><p>The updates that need your attention.</p></div>
        <div className={styles.headerActions}>
          <button type="button" onClick={() => setRead(new Set(notifications.map(notification => notification.id)))} disabled={notifications.length === 0 || read.size === notifications.length}>
            <AccountIcon name="bell" /> Mark all as read
          </button>
          <span aria-hidden="true" className={styles.actionDivider} />
          <Link href="/account/security"><AccountIcon name="security" /> Notification preferences</Link>
        </div>
      </header>

      {!activityAvailable || !walletAvailable ? <p role="status" className={styles.sourceWarning}>Some account updates could not be verified right now. Only confirmed information is shown.</p> : null}

      <div className={styles.layout}>
        <nav aria-label="Notification filters" className={styles.filters}>
          {filters.map(([key, label, icon]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
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
          </div> : visible.map(notification => <article key={notification.id} className={styles.notification} data-tone={notification.tone} data-read={read.has(notification.id)}>
            <span aria-hidden="true" className={styles.unreadDot} />
            <span className={styles.brandMark}><span>Ø</span></span>
            <div className={styles.copy}>
              <h2>{notification.title}</h2>
              <p className={styles.meta}>{notification.meta}</p>
              <p className={styles.body}>{notification.body}</p>
            </div>
            <div className={styles.visual}>
              {notification.image ? <Image src={notification.image} alt="" fill sizes="(max-width: 700px) 110px, 190px" className={styles.productImage} /> : <><span>{notification.visualLabel}</span><strong>{notification.visualValue}</strong></>}
              {notification.image && (notification.visualLabel || notification.visualValue) ? <span className={styles.visualCaption}><small>{notification.visualLabel}</small><strong>{notification.visualValue}</strong></span> : null}
            </div>
            <Link href={notification.href} className={styles.rowAction} onClick={() => setRead(previous => new Set(previous).add(notification.id))}>{notification.action}<AccountIcon name="arrow" /></Link>
            <Link href={notification.href} aria-label={`Open ${notification.title}`} className={styles.chevron} onClick={() => setRead(previous => new Set(previous).add(notification.id))}><AccountIcon name="chevron" /></Link>
          </article>)}
        </section>
      </div>
      <p className={styles.footerNote}>REAL PRODUCTS. REAL PROGRESS.</p>
    </div>
  </div>;
}
