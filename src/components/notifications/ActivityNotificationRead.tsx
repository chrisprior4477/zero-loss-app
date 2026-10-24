"use client";

import { useEffect, useRef, useState } from "react";
import type { ActivityFilter } from "@/lib/account/activity";
import { headerCategoryIds, type HeaderCategory } from "@/lib/account/header-notifications";
import { useNotifications } from "./NotificationProvider";
import styles from "./notifications.module.css";

const viewedCategories: Record<ActivityFilter, HeaderCategory[]> = {
  prize: ["wins"], completion: ["options"], active: ["entries"],
  all: ["wins", "options", "entries"], completed: ["wins"],
};

/** A mounted, visible activity view acknowledges its alerts. Server rendering
 * and prefetching never mark anything read. Unrelated categories stay unread. */
export function ActivityNotificationRead({ filter, available, detailOpen = false, visibleIds }: { filter: ActivityFilter; available: boolean; detailOpen?: boolean; visibleIds?: string[] }) {
  const notifications = useNotifications();
  const markRead = notifications?.markRead;
  const ids = [...new Set(viewedCategories[filter].flatMap(category => headerCategoryIds(notifications?.unread ?? [], category)))].filter(id => !visibleIds || visibleIds.includes(id));
  const key = JSON.stringify(ids);
  const attempted = useRef(new Set<string>());
  const mounted = useRef(false);
  const [failure, setFailure] = useState<ActivityFilter | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    // Confirmation opens an individual receipt automatically. Its background
    // list has not been read, and must not consume this or any other outcome.
    if (!available || detailOpen || !markRead) return;
    const acknowledge = () => {
      if (document.visibilityState !== "visible") return;
      const unreadIds = (JSON.parse(key) as string[]).filter(id => !attempted.current.has(id));
      if (!unreadIds.length) return;
      unreadIds.forEach(id => attempted.current.add(id));
      void markRead(unreadIds).catch(() => { if (mounted.current) setFailure(filter); });
    };
    acknowledge();
    document.addEventListener("visibilitychange", acknowledge);
    return () => document.removeEventListener("visibilitychange", acknowledge);
  }, [available, detailOpen, filter, key, markRead, retry]);
  return failure === filter ? <p role="alert" className={styles.activityReadError}>Your activity is open, but its notification status could not be saved. <button type="button" onClick={() => { attempted.current.clear(); setFailure(null); setRetry(value => value + 1); }}>Try again</button></p> : null;
}
