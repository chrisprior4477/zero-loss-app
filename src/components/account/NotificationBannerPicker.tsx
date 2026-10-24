"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { EntryTicket } from "@/components/layout/EntryTicket";
import { bannerStyles, bannerStyleNames, type NotificationPopupStyle, type BannerStyle } from "@/lib/account/banner-style";
import { saveNotificationBanner } from "@/lib/account/banner-actions";
import { NotificationBanner, previewMessages } from "@/components/notifications/NotificationBanner";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import ticket from "./menu-layout-picker.module.css";
import styles from "./notification-banner-picker.module.css";
export function NotificationBannerPicker({ initialStyle, initialEnabled, initialSpeed = 5, initialDisplaySeconds = 6, initialPopupStyle = "rounded" }: { initialStyle: BannerStyle; initialEnabled: boolean; initialSpeed?: number; initialDisplaySeconds?: number; initialPopupStyle?: NotificationPopupStyle }) {
  const notifications = useNotifications();
  const [popupStyle, setPopupStyle] = useState(initialPopupStyle);
  const [savedPopupStyle, setSavedPopupStyle] = useState(initialPopupStyle);
  const [speed, setSpeed] = useState(initialSpeed);
  const [savedSpeed, setSavedSpeed] = useState(initialSpeed);
  const [displaySeconds, setDisplaySeconds] = useState(initialDisplaySeconds);
  const [savedDisplaySeconds, setSavedDisplaySeconds] = useState(initialDisplaySeconds);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [savedEnabled, setSavedEnabled] = useState(initialEnabled);
  const [choice, setChoice] = useState(initialStyle);
  const [saved, setSaved] = useState(initialStyle);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [restoring, setRestoring] = useState(false);
  const savedPreview = useRef({ style: initialStyle, enabled: initialEnabled, speed: initialSpeed, displaySeconds: initialDisplaySeconds, popupStyle: initialPopupStyle });
  const setHeaderStyle = notifications?.setStyle;
  const setHeaderPopupStyle = notifications?.setPopupStyle;
  const setHeaderEnabled = notifications?.setEnabled;
  const setHeaderSpeed = notifications?.setSpeed;
  const setHeaderDisplaySeconds = notifications?.setDisplaySeconds;
  useEffect(() => () => {
    // Leaving the picker discards an unsaved trial, while successful saves stay.
    const saved = savedPreview.current;
    setHeaderPopupStyle?.(saved.popupStyle);
    setHeaderStyle?.(saved.style); setHeaderEnabled?.(saved.enabled);
    setHeaderSpeed?.(saved.speed); setHeaderDisplaySeconds?.(saved.displaySeconds);
  }, [setHeaderStyle, setHeaderEnabled, setHeaderSpeed, setHeaderDisplaySeconds, setHeaderPopupStyle]);
  async function restore() {
    if (!notifications) return;
    setBusy(true); setRestoring(true); setMessage("");
    try { setMessage(await notifications.restoreBanner()); setEnabled(true); setSavedEnabled(true); savedPreview.current.enabled = true; }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Your banner could not be restored. Please try again."); }
    finally { setBusy(false); setRestoring(false); }
  }
  async function save() {
    setBusy(true); setMessage("");
    try { const result = await saveNotificationBanner(choice, enabled, speed, displaySeconds, popupStyle); setMessage(result.message); if (result.ok) { savedPreview.current = { style: choice, enabled, speed, displaySeconds, popupStyle }; setSavedPopupStyle(popupStyle); setHeaderPopupStyle?.(popupStyle); setSaved(choice); setSavedEnabled(enabled); setSavedSpeed(speed); setSavedDisplaySeconds(displaySeconds); notifications?.setSpeed(speed); notifications?.setDisplaySeconds(displaySeconds); notifications?.setEnabled(enabled); notifications?.setStyle(choice); } }
    catch { setMessage("Your banner could not be saved. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className={ticket.ticket} id="notification-banner" aria-labelledby="notification-banner-heading">
    <span className={ticket.eyebrow}>MAKE IT YOURS</span><h2 id="notification-banner-heading">Change Notifications Banner</h2>
    <p className={ticket.summaryText}>Pick a style for the updates above your tickets and balance. Each opens from the center, holds, then reveals the next update.</p>
    <label className={styles.toggle}><input type="checkbox" checked={enabled} disabled={busy} onChange={e => { setEnabled(e.target.checked); setHeaderEnabled?.(e.target.checked); setMessage(""); }} /><span><strong>Show notifications in the top menu</strong><small>Turn off to keep the ticket and balance links. Updates stay on your Notifications page.</small></span></label>
    <p className={styles.saved}>Saved: {bannerStyleNames[saved]}</p>
    <fieldset disabled={busy} className={styles.grid}><legend className="sr-only">Notification banner style</legend>
      {bannerStyles.map((style, i) => <label className={styles.option} data-selected={choice === style} key={style}>
        <input type="radio" name="notification-banner-style" value={style} checked={choice === style} onChange={() => { setChoice(style); setHeaderStyle?.(style); notifications?.setBannerHidden(false); setMessage(""); }} />
        <span className={styles.name}>{i + 1}. {bannerStyleNames[style]}</span>
        <span className={styles.preview} aria-hidden="true"><span className={styles.logo}><Image src="/zeroloss-logo.svg" width={82} height={16} alt="" /></span><span className={styles.region}><span className={styles.balance}><EntryTicket count={59} /><span>◉ $978</span></span><NotificationBanner style={style} speed={speed} displaySeconds={displaySeconds} messages={previewMessages.filter(message => notifications?.supportEnabled !== false || message.label !== "Support")} /></span><span className={styles.avatar}>CP</span></span>
      </label>)}
    </fieldset>
    <div className={styles.speedControl}>
      <label htmlFor="notification-banner-speed">Banner speed <output htmlFor="notification-banner-speed">{speed} / 10</output></label>
      <input id="notification-banner-speed" type="range" min="1" max="10" step="1" value={speed} disabled={busy} aria-valuetext={`Speed ${speed} of 10`} aria-describedby="banner-speed-help" onChange={e => { const next = Number(e.target.value); setSpeed(next); setHeaderSpeed?.(next); notifications?.setBannerHidden(false); setMessage(""); }} />
      <div className={styles.speedScale} aria-hidden="true"><span>1 · Slower</span><span>10 · Faster</span></div>
      <p id="banner-speed-help">How quickly the banner opens and closes.</p>
    </div>
    <div className={styles.speedControl}>
      <label htmlFor="notification-banner-display-time">Display time <output htmlFor="notification-banner-display-time">{displaySeconds} {displaySeconds === 1 ? "second" : "seconds"}</output></label>
      <input id="notification-banner-display-time" type="range" min="1" max="10" step="1" value={displaySeconds} disabled={busy} aria-valuetext={`${displaySeconds} ${displaySeconds === 1 ? "second" : "seconds"}`} aria-describedby="banner-display-time-help" onChange={e => { const next = Number(e.target.value); setDisplaySeconds(next); setHeaderDisplaySeconds?.(next); notifications?.setBannerHidden(false); setMessage(""); }} />
      <div className={styles.speedScale} aria-hidden="true"><span>1 second</span><span>10 seconds</span></div>
      <p id="banner-display-time-help">How long each notification stays open.</p>
    </div>
    <fieldset className={styles.popupChoices} disabled={busy}>
      <legend>Popup style</legend>
      <label data-selected={popupStyle === "rounded"}><input type="radio" name="notification-popup-style" value="rounded" checked={popupStyle === "rounded"} onChange={() => { setPopupStyle("rounded"); setHeaderPopupStyle?.("rounded"); setMessage(""); }} /><span>Rounded edges</span><span aria-hidden="true" className={styles.popupSwatch} data-shape="rounded"><i /><i /></span></label>
      <label data-selected={popupStyle === "ticket"}><input type="radio" name="notification-popup-style" value="ticket" checked={popupStyle === "ticket"} onChange={() => { setPopupStyle("ticket"); setHeaderPopupStyle?.("ticket"); setMessage(""); }} /><span>Ticket</span><span aria-hidden="true" className={styles.popupSwatch} data-shape="ticket"><i /><i /></span></label>
    </fieldset>
    <p className={styles.note}>Changes preview instantly in your top banner. Save banner keeps your choices. Preview counts are examples; your banner uses your unread updates.</p>
    <div className={styles.actions}>
      <button className={ticket.quickSave} type="button" disabled={busy || (choice === saved && enabled === savedEnabled && speed === savedSpeed && displaySeconds === savedDisplaySeconds && popupStyle === savedPopupStyle)} onClick={() => void save()}>{busy && !restoring ? "Saving…" : "Save banner"}</button>
      <button className={`${ticket.quickSave} ${styles.restore}`} type="button" disabled={busy || !notifications} onClick={() => void restore()}>{restoring ? "Restoring…" : "Restore banner"}</button>
    </div>
    {message ? <p className={ticket.status} role="status">{message}</p> : null}
  </section>;
}
