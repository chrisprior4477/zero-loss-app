"use client";

import { useRef, type ReactNode } from "react";
import { signOutAction } from "@/lib/auth/actions";
import { currentProductEntryHref, readEntryIntent } from "@/lib/entries/return-intent";

export function SignOutForm({ children, className }: { children: ReactNode; className?: string }) {
  const returnField = useRef<HTMLInputElement>(null);

  return <form action={signOutAction} className={className} onSubmit={() => {
    if (!returnField.current) return;
    returnField.current.value = currentProductEntryHref(window.location.pathname, window.location.search, readEntryIntent()) ?? "";
  }}>
    <input ref={returnField} type="hidden" name="returnTo" />
    {children}
  </form>;
}
