"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";
import { freeEntryHref } from "@/lib/catalog/product-return";

type Selection = [number, (quantity: number) => void];
const EntrySelection = createContext<Selection | null>(null);

export function ProductEntrySelection({ initialQuantity, children }: { initialQuantity: number; children: ReactNode }) {
  const selection = useState(initialQuantity);
  return <EntrySelection.Provider value={selection}>{children}</EntrySelection.Provider>;
}

export function useEntrySelection(initialQuantity: number): Selection {
  const shared = useContext(EntrySelection);
  const standalone = useState(initialQuantity);
  return shared ?? standalone;
}

export function FreeEntryLink({ slug, from, className, children }: {
  slug: string; from?: string | string[]; className: string; children: ReactNode;
}) {
  const selection = useContext(EntrySelection);
  return <Link href={freeEntryHref(slug, from, selection?.[0])} className={className}>{children}</Link>;
}
