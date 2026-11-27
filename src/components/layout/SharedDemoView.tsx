"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isAccountRefreshHeld } from "@/lib/account/account-state-events";
import {
  sharedDestination,
  type DemoView,
  type Surface,
  type ViewMessage,
} from "@/lib/personal-demo/shared-view";
import styles from "./personal-demo.module.css";

// Only these read-only disclosures can open on the other screen. Every
// other tap is a visual marker, including all wallet and checkout actions.
const disclosures = {
  menu: ['button[aria-label="Open account menu"]', 'button[aria-label="Close account menu"]'],
  categories: ["button[data-browse-categories]", 'dialog[open] button[aria-label="Close browse options"]'],
  filters: ["button[data-browse-filter]", 'dialog[open] button[aria-label="Close browse options"]'],
  info: ["button[data-demo-product-info]", "dialog[open] button[data-demo-close-info]"],
} as const;
const targets = 'a[href],button,summary,[role="button"],[role="tab"]';
let tabId: string;
function visible(selector: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
    (el) => el.getClientRects().length > 0,
  );
}
function surface(): Surface {
  for (const [name, [opener]] of Object.entries(disclosures)) {
    if (document.querySelector(opener + '[aria-expanded="true"]')) return name as Surface;
  }
  return "page";
}
function here() {
  return sharedDestination(location.pathname + location.search + location.hash);
}
function markerId(el: HTMLElement) {
  const key =
    el instanceof HTMLAnchorElement
      ? el.pathname + el.search
      : el.getAttribute("aria-label") || el.id || el.textContent;
  if (!key) return "tap";
  let hash = 2166136261;
  for (const char of key.trim().toLowerCase().slice(0, 160))
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}
function paint(view: DemoView) {
  const target =
    view.mark === "tap"
      ? null
      : Array.from(document.querySelectorAll<HTMLElement>(targets)).find(
          (el) => el.getClientRects().length && markerId(el) === view.mark,
        );
  const rect = target?.getBoundingClientRect();
  const onScreen =
    rect && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
  const ring = document.createElement("span");
  ring.className = styles.peerTap;
  ring.setAttribute("aria-hidden", "true");
  ring.style.left = (onScreen ? rect.left + rect.width / 2 : (innerWidth * view.x) / 1000) + "px";
  ring.style.top = (onScreen ? rect.top + rect.height / 2 : (innerHeight * view.y) / 1000) + "px";
  (document.querySelector("dialog[open]") ?? document.body).append(ring);
  window.setTimeout(() => ring.remove(), 1050);
}

export function SharedDemoView({
  code,
  canLeadInitially,
  view,
  paused,
  send,
}: {
  code: string;
  canLeadInitially: boolean;
  view: DemoView | null;
  paused: boolean;
  send: (value: ViewMessage) => Promise<DemoView | null>;
}) {
  const router = useRouter();
  const latest = useRef({ canLeadInitially, view, paused });
  useEffect(() => {
    latest.current = { canLeadInitially, view, paused };
  }, [canLeadInitially, view, paused]);
  useEffect(() => {
    const source = (tabId ??= crypto.randomUUID());
    let live = true,
      sending = false,
      queued: ViewMessage | null = null,
      seen = 0;
    let lastSharedAt = Date.now();
    let lastUrl = here(),
      lastSurface = surface(),
      initialized = false,
      localIntent = false;
    let target: DemoView | null = null,
      navigating = "",
      navigateStarted = 0;
    let pendingTap: Pick<DemoView, "mark" | "x" | "y"> | null = null;
    let lastPulse: Pick<DemoView, "mark" | "x" | "y"> | null = null,
      pulseTime = 0;
    let editingField: Element | null = null;
    let leavingFor: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handoffKey = "zl-shared-navigation-" + code;

    async function flush() {
      if (sending || !queued || !live) return;
      sending = true;
      const payload = queued;
      queued = null;
      try {
        const saved = await send(payload);
        if (saved) {
          seen = Math.max(seen, saved.seq);
          lastSharedAt = Date.now();
        }
      } catch {
        // Keep the newest unsent view during a brief connection loss.
        if (live && !queued) queued = payload;
        if (live)
          timer = setTimeout(() => {
            sending = false;
            void flush();
          }, 1400);
        return;
      }
      sending = false;
      if (live && queued) void flush();
    }
    function publish(url: string, panel: Surface, pulse: typeof pendingTap) {
      queued = { source, code, url, surface: panel, ...(pulse ?? { mark: "", x: 500, y: 500 }) };
      void flush();
    }
    function click(event: MouseEvent) {
      if (
        !event.isTrusted ||
        !here() ||
        !(event.target instanceof Element) ||
        event.target.closest('[data-personal-demo-tools],input,textarea,select,[contenteditable="true"]')
      )
        return;
      const el = event.target.closest<HTMLElement>(targets);
      if (!el) return;
      leavingFor =
        el instanceof HTMLAnchorElement &&
        el.origin === location.origin &&
        !event.ctrlKey &&
        !event.metaKey &&
        el.target !== "_blank"
          ? sharedDestination(el.pathname + el.search + el.hash)
          : null;
      localIntent = true;
      target = null;
      navigating = "";
      pendingTap = {
        mark: el.closest("form") ? "tap" : markerId(el),
        x: Math.round(Math.max(0, Math.min(1, event.clientX / innerWidth)) * 1000),
        y: Math.round(Math.max(0, Math.min(1, event.clientY / innerHeight)) * 1000),
      };
    }
    function back() {
      localIntent = true;
      target = null;
      navigating = "";
    }
    function key(event: KeyboardEvent) {
      if (event.isTrusted && (event.key === "Escape" || event.key === "Enter")) back();
    }
    function edit(event: Event) {
      if (
        event.isTrusted &&
        event.target instanceof Element &&
        event.target.matches('input,textarea,select,[contenteditable="true"]')
      )
        editingField = event.target;
    }
    function blur(event: FocusEvent) {
      if (event.target === editingField) editingField = null;
    }
    // A plain same-site link can replace the entire document before React
    // observes its new URL. Carry only that deliberate navigation to the new page.
    function pagehide() {
      if (leavingFor && leavingFor !== here())
        try {
          sessionStorage.setItem(handoffKey, JSON.stringify({ url: leavingFor, at: Date.now() }));
        } catch {}
    }
    function tick() {
      if (document.hidden) return;
      const url = here(),
        panel = surface(),
        state = latest.current;
      if (!url) {
        lastUrl = null;
        target = null;
        localIntent = false;
        pendingTap = null;
        return;
      }
      const remote = state.view;
      if (!initialized) {
        initialized = true;
        let arrived = false;
        try {
          const handoff = JSON.parse(sessionStorage.getItem(handoffKey) ?? "null");
          sessionStorage.removeItem(handoffKey);
          arrived = handoff?.url === url && Date.now() - handoff.at < 30000;
        } catch {}
        if (arrived || (!remote && state.canLeadInitially)) publish(url, panel, null);
      }
      // Re-establish the current page if a visitor joins after the previous
      // view expired during a long idle period.
      if (
        !remote &&
        Date.now() - lastSharedAt > 19 * 60_000 &&
        state.canLeadInitially &&
        !sending &&
        !queued &&
        !state.paused
      ) {
        lastSharedAt = Date.now();
        publish(url, panel, null);
      }
      const moved = lastUrl !== url || lastSurface !== panel;
      if (pendingTap || (localIntent && moved)) {
        if (pendingTap) {
          lastPulse = pendingTap;
          pulseTime = Date.now();
        }
        publish(url, panel, pendingTap ?? (Date.now() - pulseTime < 1200 ? lastPulse : null));
        pendingTap = null;
        lastUrl = url;
        lastSurface = panel;
      }
      if (!sending && !queued && remote && remote.seq > seen) {
        seen = remote.seq;
        lastSharedAt = Date.now();
        if (remote.source !== source && sharedDestination(remote.url) === remote.url) {
          target = remote;
          navigating = "";
          localIntent = false;
        }
      }
      if (
        !target ||
        state.paused ||
        (editingField && editingField === document.activeElement) ||
        isAccountRefreshHeld()
      ) {
        lastUrl = url;
        lastSurface = panel;
        return;
      }
      if (target.url !== url) {
        if (navigating !== target.url) {
          navigating = target.url;
          navigateStarted = Date.now();
          if (panel !== "page") visible(disclosures[panel][1])?.click();
          router.replace(target.url);
        } else if (Date.now() - navigateStarted > 8000) {
          target = null;
          navigating = "";
        }
        return;
      }
      navigating = "";
      if (panel !== target.surface) {
        if (panel !== "page") visible(disclosures[panel][1])?.click();
        if (target.surface !== "page") visible(disclosures[target.surface][0])?.click();
      }
      if (target.mark) paint(target);
      target = null;
      lastUrl = url;
      lastSurface = surface();
    }
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", key, true);
    document.addEventListener("input", edit, true);
    document.addEventListener("focusout", blur, true);
    window.addEventListener("popstate", back);
    window.addEventListener("pagehide", pagehide);
    const interval = setInterval(tick, 150);
    return () => {
      live = false;
      clearInterval(interval);
      clearTimeout(timer);
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("input", edit, true);
      document.removeEventListener("focusout", blur, true);
      window.removeEventListener("popstate", back);
      window.removeEventListener("pagehide", pagehide);
    };
  }, [code, router, send]);
  return null;
}
