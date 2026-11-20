"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ActivityItem } from "@/lib/account/activity";
import { purchaseSelectionKey } from "@/lib/wallet/wallet-funding-context";
import { purchaseChoicePattern, readPurchaseHandoff, savePurchaseHandoff } from "@/lib/wallet/purchase-selection-handoff";

type Choice = { selected: string[]; decline: boolean; needsReview: boolean };
type Draft = Choice & { available: string[]; slug: string; ownerId: string };

function sameTabWalletDraft(handoffId: string, ownerId: string, slug: string) {
  if (!purchaseChoicePattern.test(handoffId)) return null;
  try {
    const raw = sessionStorage.getItem(purchaseSelectionKey);
    const draft = JSON.parse(raw ?? "null");
    if (draft?.ownerId !== ownerId || draft.slug !== slug || typeof draft.href !== "string") return null;
    const href = new URL(draft.href, window.location.origin);
    return href.origin === window.location.origin && href.pathname === "/account/wallet" && href.searchParams.get("choice")?.toLowerCase() === handoffId.toLowerCase() ? raw : null;
  } catch { return null; }
}

function readTabDraft(key: string) {
  try { return sessionStorage.getItem(key); }
  catch { return null; }
}

function restore(raw: string | null, ownerId: string, slug: string, available: string[]): Choice | null {
  if (!raw) return null;
  let draft: Partial<Draft> | null;
  try { draft = JSON.parse(raw); } catch { return null; }
  if (!draft || draft.slug !== slug || (draft.ownerId !== undefined && draft.ownerId !== ownerId)
    || typeof draft.decline !== "boolean" || !Array.isArray(draft.selected) || (!draft.selected.length && draft.needsReview !== true)
    || !draft.selected.every(id => typeof id === "string") || new Set(draft.selected).size !== draft.selected.length) return null;

  const current = new Set(available);
  const selected = draft.selected.filter(id => current.has(id));
  // Older wallet handoffs had no owner or roster. Only trust IDs that still belong to this checkout.
  if (draft.ownerId === undefined && selected.length !== draft.selected.length) return null;
  const sameOffers = Array.isArray(draft.available)
    ? new Set(draft.available).size === current.size && draft.available.every(id => current.has(id))
    : !draft.decline || selected.length === current.size;
  const changed = !sameOffers || selected.length !== draft.selected.length;
  return {
    selected,
    decline: changed ? false : draft.decline,
    needsReview: changed || draft.needsReview === true,
  };
}

function subscribeToCheckoutHistory(update: () => void) {
  window.addEventListener("popstate", update);
  window.addEventListener("pageshow", update);
  return () => {
    window.removeEventListener("popstate", update);
    window.removeEventListener("pageshow", update);
  };
}

export function useCheckoutSelection(ownerId: string, options: ActivityItem[], entryId?: string) {
  const slug = options[0].slug;
  const roster = JSON.stringify(options.map(option => option.completionOptionId));
  const available = useMemo(() => JSON.parse(roster) as string[], [roster]);
  const firstId = options.find(option => option.entryId === entryId)?.completionOptionId ?? available[0];
  const key = `zero-loss-checkout-choice:${ownerId}:${slug}:${entryId ?? "all"}`;
  const [choice, setChoice] = useState<Choice>({ selected: [firstId], decline: true, needsReview: false });
  const [handoffId, setHandoffId] = useState<string>();
  const inMemory = useRef<{ key: string; location: string; raw: string; handoffId: string; editable?: false } | null>(null);
  const locationSearch = useSyncExternalStore(subscribeToCheckoutHistory, () => window.location.search, () => "");

  useLayoutEffect(() => {
    const location = window.location.search;
    const current = inMemory.current?.key === key && inMemory.current.location === location ? inMemory.current : null;
    let saved = current ? restore(current.raw, ownerId, slug, available) : null;
    const query = new URLSearchParams(location);
    if (!saved) {
      const handoffId = query.get("choice")?.toLowerCase() ?? null;
      if (handoffId !== null) {
        const currentDraft = readTabDraft(`${key}:arrival`)?.toLowerCase() === handoffId
          ? restore(readTabDraft(key), ownerId, slug, available) : null;
        const handoff = readPurchaseHandoff(handoffId) ?? sameTabWalletDraft(handoffId, ownerId, slug);
        saved = currentDraft ?? restore(handoff, ownerId, slug, available)
          ?? { selected: [], decline: false, needsReview: true };
        try { sessionStorage.setItem(`${key}:arrival`, handoffId); } catch { /* The shared draft remains readable. */ }
      } else if (query.get("resume") === "wallet") {
        const handoff = readTabDraft(purchaseSelectionKey);
        try { sessionStorage.removeItem(purchaseSelectionKey); } catch { /* The read is still usable. */ }
        saved = restore(handoff, ownerId, slug, available);
      }
      saved ??= restore(readTabDraft(key), ownerId, slug, available);
    }
    const returning = query.has("choice") || query.get("resume") === "wallet";
    const initial = saved ?? { selected: returning ? [] : [firstId], decline: !returning, needsReview: returning };
    // Restore the selection together before the customer can review it.
    setChoice(initial);
    const draft = { ...initial, available, slug, ownerId };
    const editableId = savePurchaseHandoff(draft, current?.editable === false ? undefined : current?.handoffId);
    setHandoffId(editableId);
    inMemory.current = { key, location, raw: JSON.stringify(draft), handoffId: editableId };
    try { sessionStorage.setItem(key, inMemory.current.raw); }
    catch { /* The cross-tab snapshot remains independent of tab storage. */ }
  }, [available, firstId, key, ownerId, slug, locationSearch]);

  function updateChoice(change: Partial<Choice>) {
    const next = { ...choice, ...change };
    setChoice(next);
    const draft = { ...next, available, slug, ownerId };
    const editableId = savePurchaseHandoff(draft, inMemory.current?.editable === false ? undefined : inMemory.current?.handoffId);
    setHandoffId(editableId);
    inMemory.current = { key, location: window.location.search, raw: JSON.stringify(draft), handoffId: editableId };
    try { sessionStorage.setItem(key, inMemory.current.raw); }
    catch { /* The selection remains usable in the current page. */ }
  }
  const freezeHandoff = useCallback(() => {
    if (inMemory.current) inMemory.current.editable = false;
  }, []);

  function clearChoice() {
    inMemory.current = null;
    try {
      sessionStorage.removeItem(key);
      const arrival = sessionStorage.getItem(`${key}:arrival`);
      if (arrival && sameTabWalletDraft(arrival, ownerId, slug)) sessionStorage.removeItem(purchaseSelectionKey);
      sessionStorage.removeItem(`${key}:arrival`);
    } catch { /* Purchase is already recorded. */ }
  }
  return { ...choice, handoffId, available, updateChoice, freezeHandoff, clearChoice };
}
