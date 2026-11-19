"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_TIME_ZONE } from "@/lib/account/timezone";
import { accountLocale } from "@/lib/account/locale";

const TimeZoneContext = createContext(DEFAULT_TIME_ZONE);
const LocaleContext = createContext(accountLocale());
export function TimeZoneProvider({ value, locale, children }: { value: string; locale?: string | null; children: ReactNode }) {
  return <TimeZoneContext.Provider value={value}><LocaleContext.Provider value={accountLocale(locale)}>{children}</LocaleContext.Provider></TimeZoneContext.Provider>;
}
export function useAccountTimeZone() { return useContext(TimeZoneContext); }
export function useAccountLocale() { return useContext(LocaleContext); }
