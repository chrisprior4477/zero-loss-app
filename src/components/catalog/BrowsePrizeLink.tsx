"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { requestBrowseResultsFocus } from "./SearchResultsAutoScroll";

export function EndingSoonRangeLink({ href, selected, className, children }: { href: string; selected: boolean; className: string; children: ReactNode }) {
  return <Link href={href} prefetch={false} scroll={false} className={className} aria-current={selected ? "true" : undefined}
    onNavigate={() => requestBrowseResultsFocus(href, "ticket-range")}>{children}</Link>;
}

export function BrowsePrizeLink({ href, anchor, className, children }: {
  href: string; anchor: string; className: string; children: ReactNode;
}) {
  return <Link href={href} className={className} onNavigate={() => {
    // Browser Back should land on the same card as the item's Back to Browse link.
    const url = new URL(window.location.href);
    url.hash = anchor;
    window.history.replaceState(window.history.state, "", url);
  }}>{children}</Link>;
}
