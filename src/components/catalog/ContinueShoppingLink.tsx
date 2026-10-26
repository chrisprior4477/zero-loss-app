"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore, type ComponentProps } from "react";
import { browseReturnPath } from "@/lib/catalog/product-return";
const key = "zero-loss-shopping-return";
function current() {
  try { const saved = JSON.parse(sessionStorage.getItem(key) ?? "null"); return saved && Date.now() - saved.at < 86400000 ? browseReturnPath(saved.href) ?? "/browse" : "/browse"; } catch { return "/browse"; }
}
function subscribe(callback: () => void) { window.addEventListener("shopping-context", callback); return () => window.removeEventListener("shopping-context", callback); }
export function ShoppingContextRecorder() {
  const pathname = usePathname(), search = useSearchParams().toString();
  useEffect(() => {
    if (pathname !== "/browse") return;
    const href = browseReturnPath(`/browse${search ? `?${search}` : ""}`);
    if (!href) return;
    try { sessionStorage.setItem(key, JSON.stringify({ href, at: Date.now() })); window.dispatchEvent(new Event("shopping-context")); } catch { /* Browse remains the fallback. */ }
  }, [pathname, search]);
  return null;
}
export function ContinueShoppingLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  const href = useSyncExternalStore(subscribe, current, () => "/browse");
  return <Link {...props} href={href} />;
}
