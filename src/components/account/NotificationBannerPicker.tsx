"use client";
import { useState } from "react";
import Image from "next/image";
import { EntryTicket } from "@/components/layout/EntryTicket";
import { bannerStyles, bannerStyleNames, type BannerStyle } from "@/lib/account/banner-style";
import { saveNotificationBanner } from "@/lib/account/banner-actions";
import { NotificationBanner, previewMessages } from "@/components/notifications/NotificationBanner";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import ticket from "./menu-layout-picker.module.css";
import styles from "./notification-banner-picker.module.css";
export function NotificationBannerPicker({ initialStyle, initialEnabled, initialSpeed = 5 }: { initialStyle: BannerStyle; initialEnabled: boolean; initialSpeed?: number }) {
  const notifications = useNotifications();
  const [speed, setSpeed] = useState(initialSpeed);
  const [savedSpeed, setSavedSpeed] = useState(initialSpeed);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [savedEnabled, setSavedEnabled] = useState(initialEnabled);
  const [choice, setChoice] = useState(initialStyle);
  const [saved, setSaved] = useState(initialStyle);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true); setMessage("");
    try { const result = await saveNotificationBanner(choice, enabled, speed); setMessage(result.message); if (result.ok) { setSaved(choice); setSavedEnabled(enabled); setSavedSpeed(speed); notifications?.setSpeed(speed); notifications?.setEnabled(enabled); notifications?.setStyle(choice); } }
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
        <span className={styles.preview} aria-hidden="true"><span className={styles.logo}><Image src="/zeroloss-logo.svg" width={82} height={16} alt="" /></span><span className={styles.region}><span className={styles.balance}><EntryTicket count={59} /><span>◉ $978</span></span><NotificationBanner style={style} speed={speed} messages={previewMessages} /></span><span className={styles.avatar}>CP</span></span>
      </label>)}
    </fieldset>
    <div className={styles.speedControl}>
      <label htmlFor="notification-banner-speed">Banner speed <output htmlFor="notification-banner-speed">{speed} / 10</output></label>
      <input id="notification-banner-speed" type="range" min="1" max="10" step="1" value={speed} disabled={busy} aria-valuetext={`Speed ${speed} of 10`} aria-describedby="banner-speed-help" onChange={e => { setSpeed(Number(e.target.value)); setMessage(""); }} />
      <div className={styles.speedScale} aria-hidden="true"><span>1 · Slower</span><span>10 · Faster</span></div>
      <p id="banner-speed-help">Choose how quickly the banner opens and closes. It stays open for 6 seconds so you can read and tap it.</p>
    </div>
    <p className={styles.note}>Preview counts are examples. Your banner shows your own unread updates.</p>
    <button className={ticket.quickSave} type="button" disabled={busy || (choice === saved && enabled === savedEnabled && speed === savedSpeed)} onClick={() => void save()}>{busy ? "Saving…" : "Save banner"}</button>
    {message ? <p className={ticket.status} role="status">{message}</p> : null}
  </section>;
}
