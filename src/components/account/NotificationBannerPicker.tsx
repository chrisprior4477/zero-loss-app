"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { EntryTicket } from "@/components/layout/EntryTicket";
import { bannerStyles, bannerStyleNames, type NotificationPopupStyle, type BannerStyle } from "@/lib/account/banner-style";
import { saveNotificationBanner } from "@/lib/account/banner-actions";
import { NotificationBanner, previewMessages } from "@/components/notifications/NotificationBanner";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { useServerPreference } from "./useServerPreference";
import ticket from "./menu-layout-picker.module.css";
import styles from "./notification-banner-picker.module.css";
export function NotificationBannerPicker({ initialStyle, initialEnabled, initialSpeed = 5, initialDisplaySeconds = 6, initialPopupStyle = "rounded" }: { initialStyle: BannerStyle; initialEnabled: boolean; initialSpeed?: number; initialDisplaySeconds?: number; initialPopupStyle?: NotificationPopupStyle }) {
  const notifications = useNotifications();
  const popupPreference = useServerPreference(initialPopupStyle);
  const speedPreference = useServerPreference(initialSpeed);
  const displayPreference = useServerPreference(initialDisplaySeconds);
  const enabledPreference = useServerPreference(initialEnabled);
  const stylePreference = useServerPreference(initialStyle);
  const { value: popupStyle, savedValue: savedPopupStyle, setValue: setPopupStyle } = popupPreference;
  const { value: speed, savedValue: savedSpeed, setValue: setSpeed } = speedPreference;
  const { value: displaySeconds, savedValue: savedDisplaySeconds, setValue: setDisplaySeconds } = displayPreference;
  const { value: enabled, savedValue: savedEnabled, setValue: setEnabled } = enabledPreference;
  const { value: choice, savedValue: saved, setValue: setChoice } = stylePreference;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [restoring, setRestoring] = useState(false);
  const savedPreview = useRef({ style: initialStyle, enabled: initialEnabled, speed: initialSpeed, displaySeconds: initialDisplaySeconds, popupStyle: initialPopupStyle });
  const appliedPreview = useRef({ style: initialStyle, enabled: initialEnabled, speed: initialSpeed, displaySeconds: initialDisplaySeconds, popupStyle: initialPopupStyle });
  const setHeaderStyle = notifications?.setStyle;
  const setPreviewActive = notifications?.setPreferencesPreviewActive;
  const setHeaderPopupStyle = notifications?.setPopupStyle;
  const setHeaderEnabled = notifications?.setEnabled;
  const setHeaderSpeed = notifications?.setSpeed;
  const setHeaderDisplaySeconds = notifications?.setDisplaySeconds;
  useEffect(() => {
    savedPreview.current = { style: saved, enabled: savedEnabled, speed: savedSpeed, displaySeconds: savedDisplaySeconds, popupStyle: savedPopupStyle };
  }, [saved, savedEnabled, savedSpeed, savedDisplaySeconds, savedPopupStyle]);
  useEffect(() => {
    const previous = appliedPreview.current;
    if (previous.style !== choice) setHeaderStyle?.(choice);
    if (previous.enabled !== enabled) setHeaderEnabled?.(enabled);
    if (previous.speed !== speed) setHeaderSpeed?.(speed);
    if (previous.displaySeconds !== displaySeconds) setHeaderDisplaySeconds?.(displaySeconds);
    if (previous.popupStyle !== popupStyle) setHeaderPopupStyle?.(popupStyle);
    appliedPreview.current = { style: choice, enabled, speed, displaySeconds, popupStyle };
  }, [choice, enabled, speed, displaySeconds, popupStyle, setHeaderStyle, setHeaderEnabled, setHeaderSpeed, setHeaderDisplaySeconds, setHeaderPopupStyle]);
  useEffect(() => {
    setPreviewActive?.(true);
    return () => {
      // Leaving the picker discards an unsaved trial, while successful saves stay.
      const saved = savedPreview.current;
      setHeaderPopupStyle?.(saved.popupStyle);
      setHeaderStyle?.(saved.style); setHeaderEnabled?.(saved.enabled);
      setHeaderSpeed?.(saved.speed); setHeaderDisplaySeconds?.(saved.displaySeconds);
      setPreviewActive?.(false);
    };
  }, [setPreviewActive, setHeaderStyle, setHeaderEnabled, setHeaderSpeed, setHeaderDisplaySeconds, setHeaderPopupStyle]);
  async function restore() {
    if (!notifications) return;
    const generation = enabledPreference.generation;
    setBusy(true); setRestoring(true); setMessage("");
    try { setMessage(await notifications.restoreBanner()); setEnabled(true); enabledPreference.confirm(true, generation); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Your banner could not be restored. Please try again."); }
    finally { setBusy(false); setRestoring(false); }
  }
  async function save() {
    setBusy(true); setMessage("");
    try {
      const result = await saveNotificationBanner(choice, enabled, speed, displaySeconds, popupStyle);
      setMessage(result.message);
      if (result.ok) {
        stylePreference.confirm(choice, stylePreference.generation);
        enabledPreference.confirm(enabled, enabledPreference.generation);
        speedPreference.confirm(speed, speedPreference.generation);
        displayPreference.confirm(displaySeconds, displayPreference.generation);
        popupPreference.confirm(popupStyle, popupPreference.generation);
      }
    }
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
        <span className={styles.preview} aria-hidden="true"><span className={styles.logo}><Image src="/zeroloss-logo.svg" width={82} height={16} alt="" /></span><span className={styles.region}><span className={styles.balance}><EntryTicket count={59} /><span>◉ $978</span></span><NotificationBanner style={style} speed={speed} displaySeconds={displaySeconds} messages={previewMessages} /></span><span className={styles.avatar}>CP</span></span>
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
    <p className={styles.note}>Changes preview instantly in your top banner. Save banner keeps your choices. When you have no unread alerts, the top menu shows unclickable examples while you customize.</p>
    <div className={styles.actions}>
      <button className={ticket.quickSave} type="button" disabled={busy || (choice === saved && enabled === savedEnabled && speed === savedSpeed && displaySeconds === savedDisplaySeconds && popupStyle === savedPopupStyle)} onClick={() => void save()}>{busy && !restoring ? "Saving…" : "Save banner"}</button>
      <button className={`${ticket.quickSave} ${styles.restore}`} type="button" disabled={busy || !notifications} onClick={() => void restore()}>{restoring ? "Restoring…" : "Restore banner"}</button>
    </div>
    {message ? <p className={ticket.status} role="status">{message}</p> : null}
  </section>;
}
