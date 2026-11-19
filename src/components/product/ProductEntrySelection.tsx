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
    const { freeEntryDraft } = window.history.state ?? {};
    if (freeEntryDraft?.slug !== slug || !isEntryQuantity(freeEntryDraft.quantity)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuantity(Math.min(freeEntryDraft.quantity, maximum));
  }, [slug, maximum]);
  return <EntrySelection.Provider value={[quantity, next => {
    setQuantity(next);
    try { window.history.replaceState({ ...window.history.state, freeEntryDraft: { slug, quantity: next } }, ""); }
    catch { /* The visible selection still updates. */ }
  }]}>{children}</EntrySelection.Provider>;
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
  return <Link href={freeEntryHref(slug, from, selection?.[0], share)} className={className}>{children}</Link>;
}
