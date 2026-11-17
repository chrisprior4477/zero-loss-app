"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";
import type { AccountNotification } from "@/lib/account/notifications";
import type { NotificationGroup } from "@/lib/account/notification-groups";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { AccountIcon } from "./AccountIcon";
import styles from "./notifications.module.css";

export function NotificationStack({ group, read, categoryLabel, onOpen, destination, children, expanded: controlledExpanded, onExpandedChange, entryNumbers }: {
  group: NotificationGroup;
  read: ReadonlySet<string>;
  categoryLabel: string;
  onOpen: (event: MouseEvent<HTMLAnchorElement>, notification: AccountNotification) => void;
  destination?: (item: AccountNotification) => string;
  children?: ReactNode;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  entryNumbers?: ReadonlyMap<string, number>;
}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = controlledExpanded ?? localExpanded;
  const setExpanded = onExpandedChange ?? setLocalExpanded;
  const notification = group.notifications[0];
  const count = group.notifications.length;
  const stacked = count > 1;
  const purchaseTotal = group.purchaseTotalCents;
  const purchaseStack = purchaseTotal !== undefined;
  const openEntry = notification.tone === "active" && notification.category === "activity";
  const title = purchaseStack ? `${count} entry purchases posted` : openEntry ? notification.itemTitle || notification.title : notification.title;
  const entriesId = `notification-entries-${encodeURIComponent(group.key)}`;
  const allRead = group.notifications.every(item => read.has(item.id));
  const purchaseToggleLabel = expanded ? "Hide transactions" : `See ${count} transactions`;
  const purchaseTitle = notification.itemTitle ?? "this submission";

  return <div className={styles.stack} data-stacked={stacked}>
    <article tabIndex={-1} className={styles.notification} data-tone={notification.tone} data-read={allRead} data-emphasis={notification.id === "account-email-confirmed" ? "email" : undefined}>
      <div className={styles.main}>
        <div className={styles.visual}>
          {notification.image ? <Image src={notification.image} alt="" fill sizes="64px" className={styles.productImage} /> : <AccountIcon className={styles.fallbackIcon} name={notification.visualLabel === "Support" ? "chat" : notification.tone === "wallet" ? "wallet" : notification.tone === "crew" ? "crew" : notification.tone === "account" ? "security" : "orders"} />}
        </div>
        <div className={styles.copy}>
          <h2>{title}</h2>
          <p className={styles.body}>
            <span className={styles.unreadDot} aria-label={allRead ? "Read" : "Unread"} role="img" />
            {purchaseStack ? <>{notification.itemTitle} · <strong>{formatUsdFromCents(purchaseTotal)} total</strong></>
              : openEntry ? <><strong>{count} {count === 1 ? "entry" : "entries"}</strong> · Still open</> : notification.body}
          </p>
          {!purchaseStack && notification.entryPurchase && notification.itemTitle ? <p className={styles.visualSummary}>{notification.itemTitle}</p> : null}
          {!purchaseStack && (!notification.image || notification.entryPurchase) && (notification.visualLabel || notification.visualValue) ? <p className={styles.visualSummary}>{notification.visualLabel} {notification.visualValue}</p> : null}
          {children}
        </div>
      </div>
      <div className={styles.bottom}>
        <div className={styles.details}><strong>{categoryLabel}</strong>{!allRead ? <span className={styles.unreadBadge}>Unread</span> : null}<span>{notification.meta}</span></div>
        {stacked ? <button type="button" className={`${styles.rowAction}${purchaseStack ? ` ${styles.purchaseToggle}` : expanded ? "" : " zl-see-all"}`} aria-expanded={expanded} aria-controls={entriesId} aria-label={purchaseStack ? `${purchaseToggleLabel} for ${purchaseTitle}` : expanded ? `Collapse entries for ${title}` : `See all ${count} entries for ${title}`} onClick={() => setExpanded(!expanded)}>
          {purchaseStack ? purchaseToggleLabel : expanded ? "Collapse" : `See all ${count}`}<AccountIcon name={expanded ? "chevron" : "arrow"} className={expanded ? styles.collapseIcon : undefined} />
        </button> : <Link id={`notification-link-${encodeURIComponent(notification.id)}`} href={destination?.(notification) ?? notification.href} className={styles.rowAction} onClick={event => onOpen(event, notification)}>{openEntry ? "See entry" : notification.action}<AccountIcon name="arrow" /></Link>}
      </div>
      {stacked && expanded && !purchaseStack ? <ol id={entriesId} className={styles.entryList} aria-label={`Entries for ${title}`}>
        {group.notifications.map((item, index) => {
          const number = entryNumbers?.get(item.id) ?? index + 1;
          return <li key={item.id} data-read={read.has(item.id)}>
            <span className={styles.entryNumber} aria-hidden="true">{number}</span>
            <div className={styles.entryCopy}><strong>Entry {number}{!read.has(item.id) ? <span className={styles.unreadBadge}>Unread</span> : null}</strong><span>{item.body}</span><small>{item.meta}</small></div>
            <Link id={`notification-link-${encodeURIComponent(item.id)}`} href={destination?.(item) ?? item.href} className={styles.entryLink} aria-label={`See entry ${number} for ${title}`} onClick={event => onOpen(event, item)}>See entry<AccountIcon name="arrow" /></Link>
          </li>;
        })}
      </ol> : null}
    </article>
    {purchaseStack && expanded ? <ol id={entriesId} className={styles.purchaseTickets} aria-label={`Wallet transactions for ${purchaseTitle}`}>
      {group.notifications.map(item => <li key={item.id}>
        <NotificationStack group={{ key: `notification:${item.id}`, notifications: [item] }} read={read} categoryLabel={categoryLabel} onOpen={onOpen} destination={destination} />
      </li>)}
    </ol> : null}
  </div>;
}
