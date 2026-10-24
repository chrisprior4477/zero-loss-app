"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNotifications } from "./NotificationProvider";
import { NotificationBanner } from "./NotificationBanner";
import { notificationMessages, notificationDestination } from "@/lib/account/header-notifications";
import { containDialogTab } from "@/components/account/dialog-keyboard";
import styles from "./notifications.module.css";
export function HeaderNotifications({ children }: { children: ReactNode }) {
  const value = useNotifications();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const opener = trigger.current;
    if (!element || !value?.open) return;
    element.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = before; opener?.focus({ preventScroll: true }); };
  }, [value?.open]);
  const unread = value?.unread ?? [];
  async function act(ids: string[], href?: string) {
    if (!value || busy) return;
    setBusy(true); setError("");
    try {
      await value.markRead(ids);
      if (href) { value.setOpen(false); router.push(notificationDestination(href)); }
      else value.setOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Please try again."); }
    finally { setBusy(false); }
  }
  const active = Boolean(value?.enabled && unread.length);
  return <>
    <div className={styles.metrics} data-header-metrics>
      <div className={styles.balances} inert={active ? true : undefined} aria-hidden={active ? true : undefined}>{children}</div>
      {active ? <button ref={trigger} type="button" className={styles.trigger} aria-label={`${unread.length} unread updates. Open notifications`} aria-haspopup="dialog" aria-expanded={value?.open} onClick={() => value?.setOpen(true)}>
        {!hidden ? <NotificationBanner style={value!.style} messages={notificationMessages(unread)} paused={value?.open} /> : <span className={styles.dot} />}
      </button> : null}
    </div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="header-updates-title" onCancel={() => value?.setOpen(false)} onKeyDown={containDialogTab} onClick={e => { if (e.target === e.currentTarget) value?.setOpen(false); }}>
      <div className={styles.dialogHeading}><h2 id="header-updates-title">Your updates <span>{unread.length}</span></h2><button type="button" aria-label="Close updates" onClick={() => value?.setOpen(false)}>×</button></div>
      <div className={styles.items}>{unread.length ? unread.map(n => <button type="button" key={n.id} disabled={busy} onClick={() => void act([n.id], n.href)} className={styles.item} data-tone={n.tone}><span><strong>{n.title}</strong><small>{n.body}</small><b>{n.action} →</b></span></button>) : <p className={styles.empty}>You’re all caught up.</p>}</div>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <div className={styles.footer}>
        {unread.length ? <button disabled={busy} type="button" onClick={() => void act(unread.map(n => n.id))}>{busy ? "Saving…" : "Mark all as read"}</button> : null}
        <Link href="/account/notifications#notifications-intro" onClick={() => value?.setOpen(false)}>All notifications</Link>
        {unread.length ? <button type="button" onClick={() => { setHidden(!hidden); value?.setOpen(false); }}>{hidden ? "Show notification banner" : "Show tickets & balance"}</button> : null}
      </div>
    </dialog>
  </>;
}
export function ReturnToUpdates() {
  const search = useSearchParams();
  const value = useNotifications();
  if (search.get("fromUpdates") !== "1" || !value) return null;
  return <div className={styles.return}><button type="button" onClick={() => value.setOpen(true)}>← Back to updates{value.unread.length ? ` (${value.unread.length})` : ""}</button></div>;
}
