"use client";

import Link from "next/link";
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { freeEntryHref } from "@/lib/catalog/product-return";
import { isEntryQuantity } from "@/lib/entries/quantity";

type Selection = [number, (quantity: number) => void];
const EntrySelection = createContext<Selection | null>(null);

export function ProductEntrySelection({ slug, initialQuantity, remaining, children }: {
  slug: string; initialQuantity: number; remaining: number; children: ReactNode;
}) {
  const maximum = Math.max(1, remaining);
  const [quantity, setQuantity] = useState(Math.min(initialQuantity, maximum));
  useLayoutEffect(() => {
    // Browser Back restores this specific visit, even when the page is remounted.
    const { freeEntryDraft, ...state } = window.history.state ?? {};
    if (freeEntryDraft?.slug !== slug || !isEntryQuantity(freeEntryDraft.quantity)) return;
    try { window.history.replaceState(state, ""); } catch { /* The quantity can still be restored. */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuantity(Math.min(freeEntryDraft.quantity, maximum));
  }, [slug, maximum]);
  return <EntrySelection.Provider value={[quantity, setQuantity]}>{children}</EntrySelection.Provider>;
}

export function useEntrySelection(initialQuantity: number): Selection {
  const shared = useContext(EntrySelection);
  const standalone = useState(initialQuantity);
  return shared ?? standalone;
}

export function FreeEntryLink({ slug, from, share, className, children }: {
  slug: string; from?: string | string[]; share?: unknown; className: string; children: ReactNode;
}) {
  const selection = useContext(EntrySelection);
  const quantity = selection?.[0];
  return <Link href={freeEntryHref(slug, from, quantity, share)} className={className} onNavigate={() => {
    if (quantity === undefined) return;
    try { window.history.replaceState({ ...window.history.state, freeEntryDraft: { slug, quantity } }, ""); }
    catch { /* The instructions link still carries the selection. */ }
  }}>{children}</Link>;
}
