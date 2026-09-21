"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AvailabilitySnapshot } from "@/lib/catalog/availability";

const AvailabilityContext = createContext<AvailabilitySnapshot | null>(null);
export const useOfferingAvailability = () => useContext(AvailabilityContext);

export function OfferingAvailabilityProvider({ snapshot, children }: { snapshot: AvailabilitySnapshot | null; children: ReactNode }) {
  return <AvailabilityContext value={snapshot}>{children}</AvailabilityContext>;
}
