"use client";

import { useState, type ReactNode } from "react";

export function AccountReadRetryLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const [retrying, setRetrying] = useState(false);

  return <a href={href} className={className} aria-busy={retrying || undefined} onClick={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(event.currentTarget.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    event.preventDefault();
    if (retrying) return;
    setRetrying(true);
    history.replaceState(history.state, "", url);
    location.reload();
  }}>{retrying ? "Checking…" : children}</a>;
}
