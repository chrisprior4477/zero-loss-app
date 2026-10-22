"use client";

import { useSyncExternalStore } from "react";
import type { MenuDevice } from "@/lib/navigation/menu-layout";

function subscribe(onChange: () => void) {
  if (!window.matchMedia) return () => {};
  const queries = [window.matchMedia("(min-width: 768px)"), window.matchMedia("(min-width: 1024px)")];
  queries.forEach(query => query.addEventListener?.("change", onChange));
  return () => queries.forEach(query => query.removeEventListener?.("change", onChange));
}
function snapshot(): MenuDevice {
  if (!window.matchMedia) return "mobile";
  if (window.matchMedia("(min-width: 1024px)").matches) return "desktop";
  return window.matchMedia("(min-width: 768px)").matches ? "tablet" : "mobile";
}
function serverSnapshot(): MenuDevice | null { return null; }

/** Matches existing responsive breakpoints, including narrow desktop demos. */
export function useMenuViewport() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
