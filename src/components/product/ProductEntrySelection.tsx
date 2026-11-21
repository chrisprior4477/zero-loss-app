"use client";

import Link from "next/link";
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { freeEntryHref } from "@/lib/catalog/product-return";
import { isEntryQuantity } from "@/lib/entries/quantity";

type Selection = [quantity: number, setQuantity: (quantity: number) => void, invalidDraft: string | null, setInvalidDraft: (draft: string | null) => void];
const EntrySelection = createContext<{ selection: Selection; maximum: number } | null>(null);

export function ProductEntrySelection({ slug, initialQuantity, invalidBookmark = null, remaining, children }: {
  slug: string; initialQuantity: number; invalidBookmark?: string | null; remaining: number; children: ReactNode;
}) {
  const maximum = Math.max(1, remaining);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [invalidDraft, setInvalidDraft] = useState<string | null>(invalidBookmark);
  useLayoutEffect(() => {
    // Browser Back restores this specific visit, even when the page is remounted.
    const { freeEntryDraft } = window.history.state ?? {};
    const current = window.location.pathname + window.location.search;
    if (invalidBookmark !== null || freeEntryDraft?.slug !== slug || !isEntryQuantity(freeEntryDraft.quantity)) return;
    if (freeEntryDraft.href ? freeEntryDraft.href !== current : new URLSearchParams(window.location.search).has("quantity")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuantity(freeEntryDraft.quantity);
  }, [slug, invalidBookmark]);
  return <EntrySelection.Provider value={{ maximum, selection: [quantity, next => {
    setQuantity(next);
    try { window.history.replaceState({ ...window.history.state, freeEntryDraft: { slug, quantity: next, href: window.location.pathname + window.location.search } }, ""); }
    catch { /* The visible selection still updates. */ }
  }, invalidDraft, setInvalidDraft] }}>{children}</EntrySelection.Provider>;
}

export function useEntrySelection(initialQuantity: number): Selection {
  const shared = useContext(EntrySelection);
  const standalone = useState(initialQuantity);
  const [invalidDraft, setInvalidDraft] = useState<string | null>(null);
  return shared?.selection ?? [...standalone, invalidDraft, setInvalidDraft];
}

export function FreeEntryLink({ slug, from, share, className, children }: {
  slug: string; from?: string | string[]; share?: unknown; className: string; children: ReactNode;
}) {
  const context = useContext(EntrySelection);
  const quantity = context && context.selection[2] === null ? Math.min(context.selection[0], context.maximum) : undefined;
  return <Link href={freeEntryHref(slug, from, quantity, share)} className={className}>{children}</Link>;
}
