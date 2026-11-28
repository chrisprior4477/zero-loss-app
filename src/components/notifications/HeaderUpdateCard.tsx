"use client";

import Image from "next/image";
import { AccountIcon } from "@/components/account/AccountIcon";
import { useState } from "react";
import type { AccountNotification } from "@/lib/account/notifications";
import { headerCategories, headerCategory, resultTypes, type HeaderCategory, type ResultCategory } from "@/lib/account/header-notifications";
import { useNotifications } from "./NotificationProvider";
import styles from "./result-card.module.css";

const symbols = { wins: "prize", options: "orders", entries: "layers", support: "chat", shared: "crew", saved: "gift" } as const;

export function DirectAlertChoice({ category }: { category: ResultCategory }) {
  const account = useNotifications();
  const [pending, setPending] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const type = resultTypes[category];
  async function change(checked: boolean) {
    if (!account || pending !== null) return;
    setError("");
    setPending(checked);
    try { await account.saveDirectSetting(type.pref, checked); }
    catch { setError("Couldn’t save this choice. Please try again."); }
    finally { setPending(null); }
  }
  return <div>
    <label className={styles.preference}><input type="checkbox" checked={pending ?? account?.directSetting?.(type.pref) ?? false} disabled={pending !== null}
      onChange={event => void change(event.currentTarget.checked)} /><strong>Next time, skip directly to {type.destination}.</strong></label>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}

export function noticeName(item: AccountNotification) {
  return item.itemTitle || (headerCategory(item) === "support" ? item.body || item.title : item.title);
}

export function ResultPreview({ item, category, onOpen }: { item: AccountNotification; category: ResultCategory | "shared"; onOpen: () => void }) {
  const type = category === "shared" ? null : resultTypes[category];
  const description = category === "wins" && item.preferenceKey === "reward_ready" ? "Your prize is ready to claim." : category === "support" ? item.meta : item.body;
  return <>
    <div className={styles.preview}>
      {item.image ? <Image src={item.image} alt="" width={54} height={44} unoptimized /> : <span className={styles.icon} aria-hidden="true"><AccountIcon name={symbols[category]} width={22} height={22} /></span>}
      <div><strong>{noticeName(item)}</strong>{description && description !== noticeName(item) && <p>{description}</p>}</div>
    </div>
    <button className={styles.primary} type="button" onClick={onOpen}>{type?.action ?? item.action} →</button>
  </>;
}

export function CategoryRows({ all, unread, counts, supportEnabled, choose, pendingOnly = false }: {
  all: AccountNotification[]; unread: AccountNotification[]; counts: Record<HeaderCategory, number>;
  supportEnabled: boolean; choose: (key: HeaderCategory) => void; pendingOnly?: boolean;
}) {
  const order: HeaderCategory[] = ["wins", "options", "entries", "support", "shared", "saved"];
  return <nav aria-label="Update categories" className={styles.rows}>{order.map(key => {
    if ((!supportEnabled && key === "support") || (pendingOnly && !counts[key])) return null;
    const definition = headerCategories.find(category => category.key === key)!;
    const item = unread.find(n => headerCategory(n) === key) ?? all.find(n => headerCategory(n) === key);
    const folder = key === "shared" || key === "saved";
    return <button key={key} type="button" className={folder && !pendingOnly ? styles.folder : styles.row} data-color={definition.color} onClick={() => choose(key)}>
      {!folder && <span className={styles.symbol} aria-hidden="true"><AccountIcon name={symbols[key]} width={16} height={16} /></span>}
      <strong>{definition.label}</strong>
      {!folder && item && <small title={noticeName(item)}>{noticeName(item)}</small>}
      {counts[key] > 0 && <span className={styles.badge} aria-label={counts[key] + " unread"}>{counts[key]} new</span>}
    </button>;
  })}</nav>;
}
