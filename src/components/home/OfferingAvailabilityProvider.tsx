"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AvailabilitySnapshot } from "@/lib/catalog/availability";

const AvailabilityContext = createContext<AvailabilitySnapshot | null>(null);
const ResolvedCatalogContext = createContext<ReadonlySet<string>>(new Set());
export const useOfferingAvailability = () => useContext(AvailabilityContext);
export const useResolvedCatalogSlugs = () => useContext(ResolvedCatalogContext);

export function OfferingAvailabilityProvider({ snapshot, resolvedSlugs = [], children }: { snapshot: AvailabilitySnapshot | null; resolvedSlugs?: string[]; children: ReactNode }) {
  return <AvailabilityContext value={snapshot}><ResolvedCatalogContext value={new Set(resolvedSlugs)}>{children}</ResolvedCatalogContext></AvailabilityContext>;
}
