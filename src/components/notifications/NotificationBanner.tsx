"use client";
import { useEffect, useState } from "react";
import type { BannerStyle } from "@/lib/account/banner-style";
import type { BannerMessage } from "@/lib/account/header-notifications";
import styles from "./notifications.module.css";
export const previewMessages: BannerMessage[] = [
  { label: "You won!", count: 2, color: "green" }, { label: "Purchase options", count: 3, color: "orange" },
  { label: "Shared picks", count: 4, color: "blue" }, { label: "New updates", count: 1, color: "purple" },
];
export function NotificationBanner({ style, messages, paused = false }: { style: BannerStyle; messages: BannerMessage[]; paused?: boolean }) {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (paused || !messages.length) return;
    const timer = window.setInterval(() => { setIndex(i => (i + 1) % messages.length); setCycle(i => i + 1); }, 8200);
    return () => window.clearInterval(timer);
  }, [messages.length, paused]);
  const message = messages[index % messages.length];
  if (!message) return null;
  return <span aria-hidden="true" className={styles.artwork} data-style={style} data-color={message.color} data-paused={paused}>
    <span key={cycle} className={styles.reveal}>
      <span className={styles.surface}><span className={styles.symbol}>{message.color === "green" ? "★" : message.color === "orange" ? "✓" : message.color === "blue" ? "↗" : "●"}</span><span className={styles.label}>{message.label}</span><span className={styles.count}>{message.count > 99 ? "99+" : message.count}</span></span>
    </span>
  </span>;
}
