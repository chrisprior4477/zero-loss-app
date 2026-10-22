"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { mobileLogoSizeLabel } from "@/lib/navigation/mobile-logo-size";
import { useMobileLogoSize } from "./MobileLogoSizeProvider";
import styles from "./menu-layout-trial.module.css";

export function MobileLogoSizeTrialBar() {
  const choice = useMobileLogoSize();
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const bar = ref.current;
    if (!choice.trying || !bar) return;
    const measure = () => document.documentElement.style.setProperty("--logo-size-trial-height", `${bar.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--logo-size-trial-height"); };
  }, [choice.trying]);
  if (!choice.trying) return null;
  return <aside ref={ref} className={`${styles.bar} ${styles.mobileOnly}`} aria-label="Mobile logo size trial">
    <div className={styles.inner}>
      <p>Logo size: <strong>{mobileLogoSizeLabel(choice.size)}</strong></p>
      <div className={styles.actions}>
        <button type="button" className={styles.saveButton} disabled={choice.pending || choice.size === choice.savedSize} onClick={choice.save}>{choice.pending ? "Saving…" : choice.size === choice.savedSize ? "Size saved" : "Keep this size"}</button>
        <Link className={styles.otherStyles} href="/account/profile#personalize-logo">Change size</Link>
        <button type="button" className={styles.closeButton} aria-label="Close logo size bar" disabled={choice.pending} onClick={choice.dismiss}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      {choice.message?.error ? <p role="alert">{choice.message.text}</p> : null}
    </div>
  </aside>;
}
