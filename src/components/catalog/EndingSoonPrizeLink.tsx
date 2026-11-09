"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function EndingSoonPrizeLink({ href, anchor, className, children }: {
  href: string; anchor: string; className: string; children: ReactNode;
}) {
  return <Link href={href} className={className} onNavigate={() => {
    // Browser Back should land on the same card as the item's Back to Ending Soon link.
    const url = new URL(window.location.href);
    url.hash = anchor;
    window.history.replaceState(window.history.state, "", url);
  }}>{children}</Link>;
}
