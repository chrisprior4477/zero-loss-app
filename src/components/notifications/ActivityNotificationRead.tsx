"use client";

import { useEffect, useRef, useState } from "react";
import { revealBelowHeader } from "@/lib/account/landing-position";
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
export function ActivityNotificationRead({ filter, available, detailOpen = false, viewedEntryId, visibleIds }: { filter: ActivityFilter; available: boolean; detailOpen?: boolean; viewedEntryId?: string; visibleIds?: string[] }) {
  const notifications = useNotifications();
  const markRead = notifications?.markRead;
  const ids = [...new Set(viewedCategories[filter].flatMap(category => headerCategoryIds(notifications?.unread ?? [], category)))].filter(id => !visibleIds || visibleIds.includes(id));
  const key = JSON.stringify(ids);
  const attempted = useRef(new Set<string>());
  const mounted = useRef(false);
  const [failure, setFailure] = useState<{ filter: ActivityFilter; ids: string[] } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const retryButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    // Confirmation opens an individual receipt automatically. Its background
    // list has not been read, and must not consume this or any other outcome.
    if (!available || detailOpen || !markRead) return;
    const acknowledge = () => {
      if (document.visibilityState !== "visible") return;
      // Next may retain a previously visited screen while refreshing layouts.
      // Only the actual activity-list URL can acknowledge the visible category.
      const query = new URLSearchParams(window.location.search);
      if (window.location.pathname !== "/account/entries" || query.has("entry") || query.has("item") || query.get("resume") === "purchase" || (query.has("viewed") && query.get("viewed") !== viewedEntryId) || (query.get("grouped") === "1" && !viewedEntryId)) return;
      const unreadIds = (JSON.parse(key) as string[]).filter(id => !attempted.current.has(id));
      if (!unreadIds.length) return;
      unreadIds.forEach(id => attempted.current.add(id));
      void markRead(unreadIds).catch(() => {
        if (mounted.current) setFailure(current => ({
          filter, ids: [...new Set([...(current?.filter === filter ? current.ids : []), ...unreadIds])],
        }));
      });
    };
    acknowledge();
    document.addEventListener("visibilitychange", acknowledge);
    return () => document.removeEventListener("visibilitychange", acknowledge);
  }, [available, detailOpen, filter, key, markRead, viewedEntryId]);

  async function retryRead() {
    if (retrying || !markRead || failure?.filter !== filter) return;
    setRetrying(true);
    try {
      await markRead(failure.ids);
      if (!mounted.current) return;
      if (document.activeElement === retryButton.current) {
        const activeFilter = document.querySelector<HTMLElement>('#my-activity-filters [aria-current="page"]');
        activeFilter?.focus({ preventScroll: true });
        if (activeFilter) revealBelowHeader(activeFilter);
      }
      setFailure(current => current?.filter === filter ? {
        filter, ids: current.ids.filter(id => !failure.ids.includes(id)),
      } : current);
    } catch { /* Keep the same retry available. */ }
    finally { if (mounted.current) setRetrying(false); }
  }

  return failure?.filter === filter && failure.ids.length ? <p role="alert" className={styles.activityReadError}>Your activity is open, but its notification status could not be saved. <button ref={retryButton} type="button" aria-disabled={retrying || undefined} onClick={() => void retryRead()}>{retrying ? "Trying again…" : "Try again"}</button></p> : null;
}
