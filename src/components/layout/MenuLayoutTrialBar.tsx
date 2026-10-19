"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { menuLayouts } from "@/lib/navigation/menu-layout";
import { useMenuLayout } from "./MenuLayoutProvider";
import styles from "./menu-layout-trial.module.css";

export function MenuLayoutTrialBar() {
  const { layout, savedLayout, pending, message, save } = useMenuLayout();
  const ref = useRef<HTMLElement>(null);
  const trying = layout !== savedLayout;
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
  return <aside ref={ref} className={styles.bar} aria-label="Menu layout trial">
    <div className={styles.inner}>
      <p>Trying: <strong>{menuLayouts.find(option => option.id === layout)!.name}</strong></p>
      <div className={styles.actions}>
        <button type="button" disabled={pending} onClick={save}>{pending ? "Saving…" : "Keep this layout"}</button>
        <Link href="/account/profile#personalize-menu">Try other styles</Link>
      </div>
      {message?.error ? <p role="alert">{message.text}</p> : null}
    </div>
  </aside>;
}
