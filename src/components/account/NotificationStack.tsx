"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";
import type { AccountNotification } from "@/lib/account/notifications";
import type { NotificationGroup } from "@/lib/account/notification-groups";
import { AccountIcon } from "./AccountIcon";
import styles from "./notifications.module.css";

export function NotificationStack({ group, read, categoryLabel, onOpen, children }: {
  group: NotificationGroup;
  read: ReadonlySet<string>;
  categoryLabel: string;
  onOpen: (event: MouseEvent<HTMLAnchorElement>, notification: AccountNotification) => void;
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const notification = group.notifications[0];
  const count = group.notifications.length;
  const stacked = count > 1;
  const openEntry = notification.tone === "active" && notification.category === "activity";
  const title = openEntry ? notification.itemTitle || notification.title : notification.title;
  const entriesId = `notification-entries-${encodeURIComponent(group.key)}`;
  const allRead = group.notifications.every(item => read.has(item.id));

  return <div className={styles.stack} data-stacked={stacked}>
    <article className={styles.notification} data-tone={notification.tone} data-read={allRead} data-emphasis={notification.id === "account-email-confirmed" ? "email" : undefined}>
      <div className={styles.main}>
        <div className={styles.visual}>
          {notification.image ? <Image src={notification.image} alt="" fill sizes="64px" className={styles.productImage} /> : <AccountIcon className={styles.fallbackIcon} name={notification.visualLabel === "Support" ? "chat" : notification.tone === "wallet" ? "wallet" : notification.tone === "crew" ? "crew" : notification.tone === "account" ? "security" : "orders"} />}
        </div>
        <div className={styles.copy}>
          <h2>{title}</h2>
          <p className={styles.body}>
            <span className={styles.unreadDot} aria-label={allRead ? "Read" : "Unread"} role="img" />
            {openEntry ? <><strong>{count} {count === 1 ? "entry" : "entries"}</strong> · Still open</> : notification.body}
          </p>
          {!notification.image && (notification.visualLabel || notification.visualValue) ? <p className={styles.visualSummary}>{notification.visualLabel} {notification.visualValue}</p> : null}
          {children}
        </div>
      </div>
      <div className={styles.bottom}>
        <div className={styles.details}><strong>{categoryLabel}</strong><span>{notification.meta}</span></div>
        {stacked ? <button type="button" className={styles.rowAction} aria-expanded={expanded} aria-controls={entriesId} aria-label={expanded ? `Collapse entries for ${title}` : `See all ${count} entries for ${title}`} onClick={() => setExpanded(current => !current)}>
          {expanded ? "Collapse" : `See all ${count}`}<AccountIcon name={expanded ? "chevron" : "arrow"} className={expanded ? styles.collapseIcon : undefined} />
        </button> : <Link href={notification.href} className={styles.rowAction} onClick={event => onOpen(event, notification)}>{openEntry ? "See entry" : notification.action}<AccountIcon name="arrow" /></Link>}
      </div>
      {stacked && expanded ? <ol id={entriesId} className={styles.entryList} aria-label={`Entries for ${title}`}>
        {group.notifications.map((item, index) => <li key={item.id} data-read={read.has(item.id)}>
          <span className={styles.entryNumber} aria-hidden="true">{index + 1}</span>
          <div className={styles.entryCopy}><strong>Entry {index + 1}</strong><span>{item.body}</span><small>{item.meta}</small></div>
          <Link href={item.href} className={styles.entryLink} aria-label={`See entry ${index + 1} for ${title}`} onClick={event => onOpen(event, item)}>See entry<AccountIcon name="arrow" /></Link>
        </li>)}
      </ol> : null}
    </article>
  </div>;
}
