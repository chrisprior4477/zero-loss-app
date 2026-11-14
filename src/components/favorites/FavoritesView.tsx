"use client";
import { useAccountTimeZone } from "@/components/account/TimeZoneProvider";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { ProductShareButton } from "@/components/product/ProductShareButton";
import { useFavorites } from "./FavoritesProvider";
import { FavoritesLandingScroll } from "./FavoritesLandingScroll";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { productHrefWithBrowseReturn } from "@/lib/catalog/product-return";
import { availabilityStatus, type AvailabilitySnapshot } from "@/lib/catalog/availability";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { setFavoriteCapacityAlert } from "@/lib/favorites/alert-actions";
import { savedShareHref, savedShareStatus, sharedWithYouHref, type SavedProductShare, type SharedView } from "@/lib/sharing/saved-shares";
import { setReceivedProductState } from "@/lib/sharing/saved-share-actions";
import styles from "./favorites.module.css";

type Props = {
  hiddenSlugs?: string[];
  availability: AvailabilitySnapshot | null; initialAlerts: Record<string, boolean> | null; emailEnabled: boolean | null;
  initialShares: SavedProductShare[] | null; initialTab?: "favorites" | "shared"; initialShareId?: string; initialItem?: string;
  initialSharedView?: SharedView;
};
type Selection = { slug: string; shareId?: never } | { shareId: string; slug?: never } | null;
type SharePatch = Partial<Pick<SavedProductShare, "viewedAt" | "declinedAt">>;
const sharePatchFields = ["viewedAt", "declinedAt"] as const;
type ListPosition = { href: string; target: string; top: number };
function savedListPosition(state: unknown): ListPosition | null {
  if (!state || typeof state !== "object" || !("zeroLossFavoritesReturn" in state)) return null;
  const value = state.zeroLossFavoritesReturn;
  if (!value || typeof value !== "object" || !("href" in value) || !("target" in value) || !("top" in value)) return null;
  return (value.href === "/account/favorites" || value.href === sharedWithYouHref || value.href === savedShareHref(undefined, "declined"))
    && typeof value.target === "string" && typeof value.top === "number" && Number.isFinite(value.top) && value.top >= 0
    ? { href: value.href, target: value.target, top: value.top } : null;
}
function restoreListPosition(target?: string, top?: number) {
  requestAnimationFrame(() => {
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-saved-item]")).find(element => element.dataset.savedItem === target);
    button?.focus({ preventScroll: true });
    if (top !== undefined) window.scrollTo({ top, behavior: "instant" });
    else button?.scrollIntoView?.({ block: "nearest" });
  });
}

export function FavoritesView({ availability, hiddenSlugs, initialAlerts, emailEnabled, initialShares, initialTab = "favorites", initialShareId, initialItem, initialSharedView = "available" }: Props) {
  const timeZone = useAccountTimeZone();
  const { slugs: savedSlugs, available, toggle, busySlugs: favoriteBusy } = useFavorites();
  const hidden = useMemo(() => new Set(hiddenSlugs), [hiddenSlugs]);
  const slugs = useMemo(() => savedSlugs.filter(slug => !hidden.has(slug)), [savedSlugs, hidden]);
  const [tab, setTab] = useState(initialTab);
  const [sharedView, setSharedView] = useState<SharedView>(initialSharedView);
  const [shareOverrides, setShareOverrides] = useState<Record<string, SharePatch>>({});
  const shares = useMemo(() => (initialShares ?? []).filter(share => !hidden.has(share.slug)).map(share => ({ ...share, ...shareOverrides[share.id] })), [initialShares, hidden, shareOverrides]);
  const visibleShares = shares.filter(share => Boolean(share.declinedAt) === (sharedView === "declined"));
  const declinedCount = shares.filter(share => share.declinedAt).length;
  const [selection, setSelected] = useState<Selection>(() => {
    if (initialTab === "shared" && initialShareId) return { shareId: initialShareId };
    return initialTab === "favorites" && initialItem ? { slug: initialItem } : null;
  });
  // Resolve a received preview from the latest share list every render. A
  // missing receipt cannot turn the remembered prize into a favorite.
  const selectedShare = selection?.shareId ? shares.find(share => share.id === selection.shareId) : null;
  const requestedShareUnavailable = Boolean(selection?.shareId && initialShares !== null && !selectedShare);
  const selectedSlug = selectedShare?.slug ?? (selection?.slug && slugs.includes(selection.slug) ? selection.slug : null);
  const [alertOverrides, setAlertOverrides] = useState<Record<string, boolean>>({});
  const alerts = useMemo(() => ({ ...initialAlerts, ...alertOverrides }), [initialAlerts, alertOverrides]);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const tabs = useRef<HTMLDivElement>(null);
  const listPosition = useRef<ListPosition | null>(null);

  useEffect(() => {
    if (initialShares === null) return;
    const server = new Map(initialShares.map(share => [share.id, share]));
    // Keep only fields whose local save has not appeared in the server snapshot.
    // A viewed response never overrides an independently confirmed decline.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShareOverrides(current => {
      let changed = false;
      const remaining: Record<string, SharePatch> = {};
      for (const [id, patch] of Object.entries(current)) {
        const latest = server.get(id);
        if (!latest) { changed = true; continue; }
        const kept: SharePatch = {};
        for (const field of sharePatchFields) {
          if (!(field in patch)) continue;
          if (patch[field] === latest[field]) changed = true;
          else kept[field] = patch[field];
        }
        if (Object.keys(kept).length) remaining[id] = kept;
      }
      return changed ? remaining : current;
    });
  }, [initialShares, shareOverrides]);

  useEffect(() => {
    if (initialAlerts === null) return;
    // A stale refresh must not reverse a just-saved alert before acknowledgment.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlertOverrides(current => {
      const remaining = Object.entries(current).filter(([slug, enabled]) => Boolean(initialAlerts[slug]) !== enabled);
      return remaining.length === Object.keys(current).length ? current : Object.fromEntries(remaining);
    });
  }, [initialAlerts, alertOverrides]);
  // Let Next.js copy its internal state so a server action keeps the active tab URL.
  function location(href: string) { window.history.replaceState(null, "", href); }
  function revealHeading() { requestAnimationFrame(() => document.getElementById("saved-items-heading")?.scrollIntoView?.({ block: "start", behavior: "instant" })); }
  function chooseTab(next: "favorites" | "shared") {
    listPosition.current = null;
    setTab(next); setSelected(null); setMessage(""); location(next === "shared" ? savedShareHref(undefined, sharedView) : "/account/favorites");
    revealHeading();
  }
  function chooseSharedView(next: SharedView) {
    listPosition.current = null;
    setSharedView(next); setSelected(null); setMessage("");
    location(savedShareHref(undefined, next));
  }
  function applyShareResult(id: string, result: Awaited<ReturnType<typeof setReceivedProductState>>, viewedOnly = false) {
    if (!result.ok) { setMessage(result.message); return; }
    setShareOverrides(current => ({ ...current, [id]: { ...current[id], viewedAt: result.viewedAt, ...(!viewedOnly ? { declinedAt: result.declinedAt } : {}) } }));
    window.dispatchEvent(new Event("zero-loss-notifications-read"));
  }
  useEffect(() => {
    if (!initialShareId || !initialShares?.some(s => s.id === initialShareId && !hidden.has(s.slug))) return;
    let active = true;
    void setReceivedProductState(initialShareId, "viewed").then(result => { if (active) applyShareResult(initialShareId, result, true); })
      .catch(() => { if (active) setMessage("The item is available, but its viewed status could not be saved."); });
    return () => { active = false; };
  }, [initialShareId]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    listPosition.current = savedListPosition(window.history.state);
    function restoreHistory(state: unknown, restoreScroll: boolean) {
      if (window.location.pathname !== "/account/favorites") return;
      const query = new URLSearchParams(window.location.search);
      const nextTab = query.get("tab") === "shared" ? "shared" : "favorites";
      const nextView = query.get("view") === "declined" ? "declined" : "available";
      const shareId = nextTab === "shared" ? query.get("share") : null;
      const slug = query.get("item");
      const nextSelected = shareId ? { shareId }
        : nextTab === "favorites" && slug ? { slug } : null;
      const previousPosition = listPosition.current;
      listPosition.current = savedListPosition(state);
      setTab(nextTab); setSharedView(nextView); setSelected(nextSelected); setMessage("");
      if (!restoreScroll) return;
      if (nextSelected) revealHeading();
      else if (previousPosition?.href === (nextTab === "shared" ? savedShareHref(undefined, nextView) : "/account/favorites")) {
        restoreListPosition(previousPosition.target, previousPosition.top);
      }
    }
    // A restored Next.js page can mount after popstate using the cached list's
    // props. The browser location still carries the exact item it returned to.
    const params = new URLSearchParams(window.location.search);
    if (listPosition.current || params.has("item") || params.has("share") || params.has("view")) restoreHistory(window.history.state, false);
    const onPopState = (event: PopStateEvent) => restoreHistory(event.state, true);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  function openItem(slug: string, shareId?: string) {
    listPosition.current = { href: tab === "shared" ? savedShareHref(undefined, sharedView) : "/account/favorites", target: shareId ?? slug, top: window.scrollY };
    setSelected(shareId ? { shareId } : { slug }); setMessage("");
    // Keep the list in history; Next.js copies its router state into this entry.
    window.history.pushState({ zeroLossFavoritesReturn: listPosition.current }, "", shareId ? savedShareHref(shareId, sharedView) : `/account/favorites?item=${encodeURIComponent(slug)}`);
    revealHeading();
    if (shareId) void setReceivedProductState(shareId, "viewed").then(result => applyShareResult(shareId, result, true))
      .catch(() => setMessage("The item is available, but its viewed status could not be saved."));
  }
  function back(keepCurrentView = false) {
    const target = selection?.shareId ?? selection?.slug;
    const nextView = keepCurrentView || !selectedShare ? sharedView : selectedShare.declinedAt ? "declined" : "available";
    const href = tab === "shared" ? savedShareHref(undefined, nextView) : "/account/favorites";
    if (savedListPosition(window.history.state)?.href === href) {
      window.history.back();
      return;
    }
    // A directly opened item may have no list behind it in this tab.
    setSelected(null);
    if (tab === "shared") setSharedView(nextView);
    location(href);
    restoreListPosition(target);
  }
  async function changeShare(share: SavedProductShare, state: "declined" | "restore") {
    if (shareBusy) return;
    const previewHref = window.location.href;
    setShareBusy(share.id); setMessage("");
    try {
      const result = await setReceivedProductState(share.id, state);
      const stillViewing = window.location.href === previewHref;
      if (result.ok || stillViewing) applyShareResult(share.id, result);
      if (result.ok && stillViewing) {
        setMessage(result.message);
        back(true);
      }
    }
    catch { if (window.location.href === previewHref) setMessage("We couldn’t confirm this change. Please try again."); }
    finally { setShareBusy(null); }
  }
  function toggleAlert(slug: string) {
    if (busySlug || !initialAlerts || emailEnabled === null) return;
    const enabled = !alerts[slug]; setBusySlug(slug); setMessage("");
    startTransition(async () => {
      try { const result = await setFavoriteCapacityAlert(slug, enabled); if (result.ok) setAlertOverrides(current => ({ ...current, [slug]: enabled })); setMessage(result.message); }
      catch { setMessage("We couldn’t confirm this change. Refresh and try again."); }
      finally { setBusySlug(null); }
    });
  }
  function productState(slug: string) {
    const product = getDemoProduct(slug), current = availability?.[slug];
    return {
      product,
      entryPriceCents: current?.entryPriceCents ?? Math.round((product?.entryPrice ?? 0) * 100),
      status: product ? availabilityStatus(current?.capacity ?? product.capacity, current?.sold ?? product.sold) : null,
    };
  }
  function art(slug: string, large = false, shareId?: string) {
    const product = getDemoProduct(slug);
    const artwork = product ? <Image src={product.gallery[0].src} alt={product.title} fill sizes={large ? "(max-width: 640px) 90vw, 420px" : "(max-width: 640px) 50vw, 25vw"} className="object-contain p-2" /> : <span>Product unavailable</span>;
    return <div className={`${styles.art} ${large ? styles.largeArt : ""}`}>
      {large ? artwork : <button type="button" className={styles.artButton} aria-label={`View ${product?.title ?? "shared product"}`} onClick={() => openItem(slug, shareId)}>{artwork}</button>}
      <FavoriteButton itemName={product?.title ?? "this product"} itemHref={`/items/${slug}`} size="large" className={styles.heart} />
    </div>;
  }
  function price(slug: string, large = false) {
    const { product, entryPriceCents, status } = productState(slug);
    if (!product) return null;
    return <div className={`${styles.price} ${large ? styles.detailPrice : ""}`}><span><strong>${(entryPriceCents / 100).toFixed(2)}</strong>per entry</span>
      <span className={styles.remaining} style={{ color: status?.color }}>{status?.remaining === 0 ? "Pool full" : <><strong>{status?.remaining.toLocaleString()}</strong> left</>}</span></div>;
  }
  function sender(share: SavedProductShare) {
    return <div className={styles.sender}><span aria-hidden="true">{share.sender[0]?.toUpperCase() ?? "?"}</span><div>From {share.sender}<small>{share.demo ? "Demo share · " : ""}{new Date(share.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone })}</small></div></div>;
  }
  const missingFavoriteSlug = tab === "favorites" && available && !selectedSlug ? selection?.slug : undefined;
  const missingFavorite = missingFavoriteSlug ? productState(missingFavoriteSlug) : null;
  const { product: detailProduct, entryPriceCents: detailEntryPrice, status: detailStatus } = productState(selectedSlug ?? "");
  const detailHref = detailProduct && detailStatus?.remaining !== 0 ? productHrefWithBrowseReturn(detailProduct.slug, selectedShare ? savedShareHref(selectedShare.id, selectedShare.declinedAt ? "declined" : "available") : `/account/favorites?item=${detailProduct.slug}`)
    + (selectedShare?.token ? `&share=${selectedShare.token}` : "") : null;
  return <section className={styles.page} aria-labelledby="saved-items-heading">
    <FavoritesLandingScroll enabled />
    <div className={styles.container}>
      <h1 id="saved-items-heading" className={styles.heading}>Favorites &amp; Sent to You</h1>
      <div ref={tabs} className={styles.tabs} role="tablist" aria-label="Saved items" onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault(); const next = event.key === "Home" ? "favorites" : event.key === "End" ? "shared" : tab === "favorites" ? "shared" : "favorites";
        chooseTab(next); tabs.current?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
      }}>
        <button type="button" id="your-favorites-tab" role="tab" data-tab="favorites" aria-controls="saved-products-panel" aria-selected={tab === "favorites"} tabIndex={tab === "favorites" ? 0 : -1} onClick={() => chooseTab("favorites")}>Your Favorites <span>{available ? slugs.length : "–"}</span></button>
        <button type="button" id="shared-with-you-tab" role="tab" data-tab="shared" aria-controls="saved-products-panel" aria-selected={tab === "shared"} tabIndex={tab === "shared" ? 0 : -1} onClick={() => chooseTab("shared")}>Shared with You <span>{initialShares ? shares.length : "–"}</span></button>
      </div>
      {message ? <p role="status" className={styles.message}>{message}</p> : null}
      <section id="saved-products-panel" role="tabpanel" aria-labelledby={tab === "favorites" ? "your-favorites-tab" : "shared-with-you-tab"}>
        {selectedSlug ? <>
          <button type="button" className={styles.back} onClick={() => back()}>← {tab === "shared" ? "Shared with You" : "Your Favorites"}</button>
          <article className={styles.detail}>
            {selectedShare ? sender(selectedShare) : null}{art(selectedSlug, true)}
            <div className={styles.detailBody}>
              <p className={styles.merchant}>{detailProduct?.retailer ?? "Zero Loss"}</p><h2>{detailProduct?.title ?? selectedShare?.title ?? "Product unavailable"}</h2>
              {selectedShare ? <span className={`${styles.badge} ${selectedShare.declinedAt ? styles.declined : ""}`}>{savedShareStatus(selectedShare)}</span> : null}
              {price(selectedSlug, true)}
              {detailHref && !selectedShare?.declinedAt ? <Link className={selectedShare ? styles.productLink : styles.entryButton} href={detailHref}>{selectedShare ? "Open prize details →" : `Enter for ${formatUsdFromCents(detailEntryPrice)}`}</Link> : null}
              {!detailProduct ? <p>This product is no longer available in the current catalog.</p> : null}
              <div className={styles.detailActions}>
                <div><button type="button" className={styles.saveFavorite} disabled={favoriteBusy.includes(selectedSlug) || !detailProduct || !available} onClick={() => toggle(selectedSlug)}>{slugs.includes(selectedSlug) ? "♥ Saved to Favorites" : "♡ Save to Favorites"}</button>
                  {selectedShare?.declinedAt && detailHref ? <Link className={styles.reopenButton} href={detailHref}>Reopen prize →</Link> : null}
                </div>
                <div>{detailProduct ? <ProductShareButton product={{ slug: detailProduct.slug, title: detailProduct.title, image: detailProduct.gallery[0].src, retailer: detailProduct.retailer, value: detailProduct.value }} label="Share" className={styles.shareButton} /> : null}<button type="button" className={styles.backToList} onClick={() => back()}>Back to list</button></div>
              </div>
              {selectedShare ? <><button type="button" className={styles.declineButton} disabled={shareBusy !== null} onClick={() => void changeShare(selectedShare, selectedShare.declinedAt ? "restore" : "declined")}>{shareBusy === selectedShare.id ? "Saving…" : selectedShare.declinedAt ? "Undo decline" : "Decline this share"}</button><p className={styles.kept}>{selectedShare.declinedAt ? detailHref ? "Reopen the prize to look again, or undo your decline to move it to Available." : "Undo your decline to move this share to Available." : "Declining moves this share to Declined. You can revisit it while its pool is open."}</p></> : null}
            </div>
          </article>
        </> : tab === "favorites" ? <>
          {missingFavorite ? <div role="status" className={styles.empty}>
            <h2>This prize is no longer in your Favorites</h2>
            <button type="button" className={styles.back} onClick={() => back()}>Back to Favorites</button>
            {missingFavorite.product && !hidden.has(missingFavorite.product.slug) && (missingFavorite.status?.remaining ?? 0) > 0 ? <Link href={`/items/${missingFavorite.product.slug}`}>View prize →</Link> : null}
          </div> : null}
          {emailEnabled === false ? <p className={styles.notice}>Favorite emails are paused in <Link href="/account/notifications#favorite-alert-preference">Notifications</Link>.</p> : null}
          {initialAlerts === null || emailEnabled === null ? <p role="status" className={styles.notice}>Alert choices are unavailable. Your saved items are unchanged.</p> : null}
          {!available ? <p role="alert" className={styles.empty}>Favorites couldn’t be loaded. Refresh to try again; nothing has been removed.</p>
            : !slugs.length ? <div className={styles.empty}><h2>No favorites yet</h2><p>Tap a product’s heart to keep it here.</p><Link href="/browse">Browse products →</Link></div>
              : <div id="favorite-products" aria-label="Favorite products" className={styles.grid}>{slugs.map(slug => {
                const { product, status } = productState(slug);
                return <article key={slug} className={styles.card}>{art(slug)}
                  <div className={styles.cardBody}><p className={styles.merchant}>{product?.retailer ?? "Zero Loss"}</p><h2><button type="button" data-saved-item={slug} onClick={() => openItem(slug)}>{product?.title ?? "Product unavailable"}</button></h2>{price(slug)}</div>
                  {product && status?.remaining !== 0 ? <label className={styles.alert}><input type="checkbox" checked={Boolean(alerts[slug])} disabled={!initialAlerts || emailEnabled === null || pending || busySlug !== null} onChange={() => toggleAlert(slug)} aria-label={`Email me when ${product.title} is almost full`} />Email me at 90% full</label>
                    : product ? <p className={styles.alert}>This pool is full; watchlist email unavailable.</p> : null}
                </article>;
              })}</div>}
        </> : <>
          <div className={styles.shareFilters} role="group" aria-label="Shared prize status">
            <button type="button" aria-pressed={sharedView === "available"} onClick={() => chooseSharedView("available")}>Available <span>{initialShares ? shares.length - declinedCount : "–"}</span></button>
            <button type="button" aria-pressed={sharedView === "declined"} onClick={() => chooseSharedView("declined")}>Declined <span>{initialShares ? declinedCount : "–"}</span></button>
          </div>
          <p className={styles.note}>{sharedView === "declined" ? "Shares you declined. Reopen a prize while its pool is still available." : "Open prizes shared with you. Declined shares are in the Declined view."}</p>
          {requestedShareUnavailable ? <div role="status" className={styles.empty}><h2>This shared prize is no longer available</h2><p>You can browse other prizes or view any other available items shared with you.</p><Link href="/browse">Browse products →</Link></div> : null}
          {initialShares === null ? <p role="alert" className={styles.empty}>Shared items couldn’t be loaded. Refresh to try again; nothing has been removed.</p>
            : !visibleShares.length ? requestedShareUnavailable ? null : <div className={styles.empty}><h2>{!shares.length && sharedView === "available" ? "Nothing shared with you yet" : sharedView === "declined" ? "No declined shares" : "No available shares"}</h2><p>{sharedView === "declined" ? "Shares you decline appear here while their pools remain open." : declinedCount ? "Check Declined to revisit a share." : "Items people send you will appear here."}</p></div>
              : <div aria-label="Items shared with you" className={styles.grid}>{visibleShares.map(share => {
                const { product, status } = productState(share.slug);
                const reopenHref = share.declinedAt && product && status?.remaining !== 0
                  ? productHrefWithBrowseReturn(share.slug, savedShareHref(share.id, "declined")) + (share.token ? `&share=${share.token}` : "") : null;
                return <article key={share.id} className={styles.card}>{art(share.slug, false, share.id)}<div className={styles.cardBody}>{sender(share)}<span className={`${styles.badge} ${share.declinedAt ? styles.declined : ""}`}>{savedShareStatus(share)}</span><p className={styles.merchant}>{product?.retailer ?? "Zero Loss"}</p><h2>{product?.title ?? share.title}</h2><button type="button" className={styles.viewButton} data-saved-item={share.id} onClick={() => openItem(share.slug, share.id)}>{share.declinedAt ? "View declined share" : "View prize"} <span aria-hidden="true">→</span></button>{reopenHref ? <Link className={styles.reopenButton} href={reopenHref}>Reopen prize →</Link> : null}</div></article>;
              })}</div>}
        </>}
      </section>
    </div>
  </section>;
}
