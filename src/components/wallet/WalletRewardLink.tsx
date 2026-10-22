"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/** Next can treat the already-selected URL as a no-op; its section still needs revealing. */
export function WalletRewardLink({ href, ...props }: Omit<ComponentProps<typeof Link>, "href" | "onClick"> & { href: string }) {
  return <Link {...props} href={href} onClick={event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target && props.target !== "_self") return;
    const destination = new URL(href, window.location.href);
    if (destination.href !== window.location.href || !destination.hash) return;
    const section = document.getElementById(destination.hash.slice(1));
    if (!section) return;
    event.preventDefault();
    section.scrollIntoView({ block: "start", behavior: "auto" });
  }} />;
}
