"use client";
import { useState } from "react";
import { bannerStyles, bannerStyleNames, type BannerStyle } from "@/lib/account/banner-style";
import { saveNotificationBanner } from "@/lib/account/banner-actions";
import { NotificationBanner, previewMessages } from "@/components/notifications/NotificationBanner";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import ticket from "./menu-layout-picker.module.css";
import styles from "./notification-banner-picker.module.css";
export function NotificationBannerPicker({ initialStyle, initialEnabled }: { initialStyle: BannerStyle; initialEnabled: boolean }) {
  const notifications = useNotifications();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [savedEnabled, setSavedEnabled] = useState(initialEnabled);
  const [choice, setChoice] = useState(initialStyle);
  const [saved, setSaved] = useState(initialStyle);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true); setMessage("");
    try { const result = await saveNotificationBanner(choice, enabled); setMessage(result.message); if (result.ok) { setSaved(choice); setSavedEnabled(enabled); notifications?.setEnabled(enabled); notifications?.setStyle(choice); } }
    catch { setMessage("Your banner could not be saved. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className={ticket.ticket} id="notification-banner" aria-labelledby="notification-banner-heading">
    <span className={ticket.eyebrow}>MAKE IT YOURS</span><h2 id="notification-banner-heading">Change Notifications Banner</h2>
    <p className={ticket.summaryText}>Pick a style for the updates above your tickets and balance. Each opens from the center, holds, then reveals the next update.</p>
    <label className={styles.toggle}><input type="checkbox" checked={enabled} disabled={busy} onChange={e => { setEnabled(e.target.checked); setMessage(""); }} /><span><strong>Show notifications in the top menu</strong><small>Turn off to keep the ticket and balance links. Updates stay on your Notifications page.</small></span></label>
    <p className={styles.saved}>Saved: {bannerStyleNames[saved]}</p>
    <fieldset disabled={busy} className={styles.grid}><legend className="sr-only">Notification banner style</legend>
      {bannerStyles.map((style, i) => <label className={styles.option} data-selected={choice === style} key={style}>
        <input type="radio" name="notification-banner-style" value={style} checked={choice === style} onChange={() => { setChoice(style); setMessage(""); }} />
        <span className={styles.name}>{i + 1}. {bannerStyleNames[style]}</span>
        <span className={styles.preview}><span className={styles.logo}>ZERØ<span>LØSS</span></span><span className={styles.region}><span className={styles.balance}>▱ 59 ◉ $978</span><NotificationBanner style={style} messages={previewMessages} /></span><span className={styles.avatar}>CP</span></span>
      </label>)}
    </fieldset>
    <p className={styles.note}>Preview counts are examples. Your banner shows your own unread updates.</p>
    <button className={ticket.quickSave} type="button" disabled={busy || (choice === saved && enabled === savedEnabled)} onClick={() => void save()}>{busy ? "Saving…" : "Save banner"}</button>
    {message ? <p className={ticket.status} role="status">{message}</p> : null}
  </section>;
}
