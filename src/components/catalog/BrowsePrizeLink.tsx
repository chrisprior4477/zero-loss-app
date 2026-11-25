"use client";

import Link from "next/link";
import { returnBrowseSearchDraft, useBrowseResultsSearch } from "./BrowseResultsSearch";
import { catalogSearchTooLong, invalidCatalogSearch } from "@/lib/catalog/search-text";
import type { ReactNode } from "react";
import { requestBrowseResultsFocus } from "./SearchResultsAutoScroll";

export function BrowseResultsLink({ href, className, target, returnAnchor, searchDraft, children }: { href: string; className?: string; target?: Parameters<typeof requestBrowseResultsFocus>[1]; returnAnchor?: string; searchDraft?: string; children: ReactNode }) {
  return <Link id={returnAnchor} href={href} prefetch={false} scroll={false} className={className} onNavigate={() => {
    if (returnAnchor) window.history.replaceState(window.history.state, "", "#" + returnAnchor);
    if (searchDraft !== undefined) returnBrowseSearchDraft(href, searchDraft);
    if (target) requestBrowseResultsFocus(href, target);
  }}>{children}</Link>;
}

export function BrowseProductRequestLink({ href, className }: { href: string; className: string }) {
  const session = useBrowseResultsSearch();
  const url = new URL(href, "https://zeroloss.local");
  const draft = session?.draft.trim();
  if (draft !== undefined && !catalogSearchTooLong(draft) && !invalidCatalogSearch(draft)) {
    url.searchParams.set("product", draft);
  }
  return <Link id="request-a-product" href={url.pathname + url.search + url.hash} prefetch={false} data-history-return className={className}>Request a product →</Link>;
}

export function EndingSoonRangeLink({ href, selected, className, children }: { href: string; selected: boolean; className: string; children: ReactNode }) {
  const session = useBrowseResultsSearch();
  const url = new URL(href, "https://zeroloss.local");
  if (session) {
    const search = session.draft.trim();
    if (!catalogSearchTooLong(search) && !invalidCatalogSearch(search)) {
      if (search) url.searchParams.set("q", search);
      else url.searchParams.delete("q");
    }
  }
  const destination = url.pathname + url.search + url.hash;
  return <Link href={destination} prefetch={false} scroll={false} className={className} aria-current={selected ? "true" : undefined}
    onNavigate={() => requestBrowseResultsFocus(destination, "ticket-range")}>{children}</Link>;
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
