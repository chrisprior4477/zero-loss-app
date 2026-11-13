"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import type { ActivityItem } from "@/lib/account/activity";
import { purchaseSelectionKey } from "@/lib/wallet/wallet-funding-context";
import { readPurchaseHandoff, savePurchaseHandoff } from "@/lib/wallet/purchase-selection-handoff";

type Choice = { selected: string[]; decline: boolean; needsReview: boolean };
type Draft = Choice & { available: string[]; slug: string; ownerId: string };

function restore(raw: string | null, ownerId: string, slug: string, available: string[], firstId: string): Choice | null {
  if (!raw) return null;
  let draft: Partial<Draft> | null;
  try { draft = JSON.parse(raw); } catch { return null; }
  if (!draft || draft.slug !== slug || (draft.ownerId !== undefined && draft.ownerId !== ownerId)
    || typeof draft.decline !== "boolean" || !Array.isArray(draft.selected) || !draft.selected.length
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
    selected: selected.length ? selected : [firstId],
    decline: changed ? false : draft.decline,
    needsReview: changed || draft.needsReview === true,
  };
}

export function useCheckoutSelection(ownerId: string, options: ActivityItem[], entryId?: string, sample = false) {
  const slug = options[0].slug;
  const available = useMemo(() => options.map(option => option.completionOptionId!), [options]);
  const firstId = options.find(option => option.entryId === entryId)?.completionOptionId ?? available[0];
  const key = `zero-loss-checkout-choice:${ownerId}:${slug}:${entryId ?? "all"}`;
  const [choice, setChoice] = useState<Choice>({ selected: [firstId], decline: true, needsReview: false });
  const [handoffId, setHandoffId] = useState<string>();

  useLayoutEffect(() => {
    if (sample) return;
    let saved: Choice | null = null;
    const query = new URLSearchParams(window.location.search);
    try {
      const handoffId = query.get("choice");
      if (handoffId !== null) {
        const currentDraft = sessionStorage.getItem(`${key}:arrival`) === handoffId
          ? restore(sessionStorage.getItem(key), ownerId, slug, available, firstId) : null;
        saved = currentDraft ?? restore(readPurchaseHandoff(handoffId), ownerId, slug, available, firstId)
          ?? { selected: [firstId], decline: false, needsReview: true };
        sessionStorage.setItem(`${key}:arrival`, handoffId);
      } else if (query.get("resume") === "wallet") {
        const handoff = sessionStorage.getItem(purchaseSelectionKey);
        sessionStorage.removeItem(purchaseSelectionKey);
        saved = restore(handoff, ownerId, slug, available, firstId);
      }
      saved ??= restore(sessionStorage.getItem(key), ownerId, slug, available, firstId);
    } catch { /* An unreadable tab draft does not authorize a purchase. */ }
    const returning = query.has("choice") || query.get("resume") === "wallet";
    const initial = saved ?? { selected: [firstId], decline: !returning, needsReview: returning };
    // Restore the selection together before the customer can review it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(initial);
    setHandoffId(savePurchaseHandoff({ ...initial, available, slug, ownerId }));
    try { sessionStorage.setItem(key, JSON.stringify({ ...initial, available, slug, ownerId })); }
    catch { /* The cross-tab snapshot remains independent of tab storage. */ }
  }, [available, firstId, key, ownerId, slug, sample]);

  function updateChoice(change: Partial<Choice>) {
    const next = { ...choice, ...change };
    setChoice(next);
    if (sample) return;
    setHandoffId(savePurchaseHandoff({ ...next, available, slug, ownerId }));
    try { sessionStorage.setItem(key, JSON.stringify({ ...next, available, slug, ownerId })); }
    catch { /* The selection remains usable in the current page. */ }
  }
  function clearChoice() {
    try { sessionStorage.removeItem(key); } catch { /* Purchase is already recorded. */ }
  }
  return { ...choice, handoffId, available, updateChoice, clearChoice };
}
