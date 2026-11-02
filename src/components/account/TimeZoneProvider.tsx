"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_TIME_ZONE } from "@/lib/account/timezone";

const TimeZoneContext = createContext(DEFAULT_TIME_ZONE);
export function TimeZoneProvider({ value, children }: { value: string; children: ReactNode }) {
  return <TimeZoneContext.Provider value={value}>{children}</TimeZoneContext.Provider>;
}
export function useAccountTimeZone() { return useContext(TimeZoneContext); }
