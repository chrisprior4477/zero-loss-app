"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { menuLayouts } from "@/lib/navigation/menu-layout";
import { useMenuLayout } from "./MenuLayoutProvider";
import { useMobileLogoSize } from "./MobileLogoSizeProvider";
import styles from "./menu-layout-trial.module.css";

export function MenuLayoutTrialBar() {
  const { layout, savedLayout, trying, pending, message, save, dismiss } = useMenuLayout();
  const logo = useMobileLogoSize();
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const bar = ref.current;
    if (!trying || !bar) return;
    const measure = () => document.documentElement.style.setProperty("--menu-trial-height", `${bar.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--menu-trial-height"); };
  }, [trying]);
  if (!trying) return null;
  return <aside ref={ref} className={styles.bar} data-logo-trial-active={logo.trying} aria-label="Menu layout trial">
    <div className={styles.inner}>
      <p>Trying: <strong>{menuLayouts.find(option => option.id === layout)!.name}</strong></p>
      <div className={styles.actions}>
        <button className={styles.saveButton} type="button" disabled={pending || layout === savedLayout} onClick={save}>{pending ? "Saving…" : layout === savedLayout ? "Layout saved" : "Save layout"}</button>
        <Link className={styles.otherStyles} href="/account/profile#personalize-menu">Try other styles</Link>
        <button className={styles.closeButton} type="button" aria-label="Close layout bar" title="Close layout bar" disabled={pending} onClick={dismiss}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      {message?.error ? <p role="alert">{message.text}</p> : null}
    </div>
  </aside>;
}
