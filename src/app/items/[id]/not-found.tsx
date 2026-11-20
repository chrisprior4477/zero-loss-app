"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { productBrowseReturnPath } from "@/lib/catalog/product-return";
import { HelpLandingScroll } from "@/components/help/HelpLandingScroll";

const linkClass = "mt-5 inline-flex min-h-11 items-center font-bold text-cyan-300 underline";

function PrizeRecoveryLink() {
  const params = useSearchParams();
  const from = params?.get("from");
  const origin = productBrowseReturnPath(from)
    ?? (from?.endsWith("#search-results") ? productBrowseReturnPath(from.slice(0, -"#search-results".length)) : null);
  const href = origin?.startsWith("/browse") && !origin.includes("#") ? origin + "#search-results" : origin ?? "/browse#search-results";
  return <Link className={linkClass} href={href}>{origin ? "Back to your previous list" : "Browse current prizes"} →</Link>;
}

export default function ItemNotFound() {
  return <section className="mx-auto max-w-3xl px-5 py-12 text-white">
    <HelpLandingScroll target="unavailable-prize" focusOnArrival />
    <h1 id="unavailable-prize" tabIndex={-1} className="text-3xl font-black">Prize unavailable</h1>
    <p className="mt-3 text-white/75">This prize link may be out of date.</p>
    <Suspense fallback={<Link className={linkClass} href="/browse#search-results">Browse current prizes →</Link>}><PrizeRecoveryLink /></Suspense>
  </section>;
}
