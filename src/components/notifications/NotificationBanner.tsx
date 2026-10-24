"use client";
import { useEffect, useState, type CSSProperties } from "react";
import type { BannerStyle } from "@/lib/account/banner-style";
import { bannerTiming } from "@/lib/account/banner-style";
import type { BannerMessage, HeaderCategory } from "@/lib/account/header-notifications";
import styles from "./notifications.module.css";
export const previewMessages: BannerMessage[] = [
  { label: "You won!", count: 1, color: "green" }, { label: "Purchase options", count: 1, color: "orange" },
  { label: "Shared picks", count: 1, color: "blue" }, { label: "Support tickets", count: 1, color: "purple" },
];
export function NotificationBanner({ style, messages, speed = 5, displaySeconds = 6, paused = false, onCategoryChange }: { style: BannerStyle; messages: BannerMessage[]; speed?: number; displaySeconds?: number; paused?: boolean; onCategoryChange?: (category: HeaderCategory | null) => void }) {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const { revealMs, holdMs, gapMs, cycleMs } = bannerTiming(speed, displaySeconds);
  useEffect(() => {
    if (paused || !messages.length) return;
    const timer = window.setInterval(() => { setIndex(i => (i + 1) % messages.length); setCycle(i => i + 1); }, cycleMs);
    return () => window.clearInterval(timer);
  }, [messages.length, paused, cycleMs, style, speed, displaySeconds]);
  const message = messages[index % messages.length];
  useEffect(() => { onCategoryChange?.(message?.category ?? null); }, [message?.category, onCategoryChange]);
  if (!message) return null;
  return <span aria-hidden="true" className={styles.artwork} data-style={style} data-color={message.color} data-paused={paused} style={{ "--reveal-duration": `${revealMs}ms`, "--reveal-gap": `${gapMs}ms`, "--close-delay": `${gapMs + revealMs + holdMs}ms` } as CSSProperties}>
    <span key={`${message.category ?? message.label}-${cycle}-${style}-${speed}-${displaySeconds}`} className={styles.reveal}>
      <span className={styles.surface}><span className={styles.symbol}>{message.color === "green" ? "★" : message.color === "orange" ? "✓" : message.color === "blue" ? "↗" : "●"}</span><span className={styles.label}>{message.label}</span><span className={styles.count}>{message.count > 99 ? "99+" : message.count}</span></span>
    </span>
  </span>;
}
