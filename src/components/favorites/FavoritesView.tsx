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
import { availabilityStatus, lightSurfaceAvailabilityColor, type AvailabilitySnapshot } from "@/lib/catalog/availability";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { readFavoriteCapacityAlert, setFavoriteCapacityAlert } from "@/lib/favorites/alert-actions";
import { savedShareHref, savedShareStatus, sharedWithYouHref, type SavedProductShare, type SharedView } from "@/lib/sharing/saved-shares";
import { readReceivedProductState, setReceivedProductState } from "@/lib/sharing/saved-share-actions";
import { revealBelowHeader } from "@/lib/account/landing-position";
import styles from "./favorites.module.css";

type Props = {
  hiddenSlugs?: string[];
  availability: AvailabilitySnapshot | null; initialAlerts: Record<string, boolean> | null; emailEnabled: boolean | null;
  initialShares: SavedProductShare[] | null; initialTab?: "favorites" | "shared"; initialShareId?: string; initialItem?: string;
  sharesIncomplete?: boolean;
  initialSharedView?: SharedView;
  initialFavoriteFilter?: FavoriteFilter;
};
type FavoriteFilter = "all" | "watching";
function favoritesHref(filter: FavoriteFilter, slug?: string) {
  const params = new URLSearchParams();
  if (slug) params.set("item", slug);
  if (filter === "watching") params.set("watch", "1");
  return `/account/favorites${params.size ? `?${params}` : ""}`;
}
type Selection = { slug: string; shareId?: never } | { shareId: string; slug?: never } | null;
type SharePatch = Partial<Pick<SavedProductShare, "viewedAt" | "declinedAt">>;
const sharePatchFields = ["viewedAt", "declinedAt"] as const;
type ListPosition = { href: string; target: string; top: number; artwork?: boolean };
function savedListPosition(state: unknown): ListPosition | null {
  if (!state || typeof state !== "object" || !("zeroLossFavoritesReturn" in state)) return null;
  const value = state.zeroLossFavoritesReturn;
  if (!value || typeof value !== "object" || !("href" in value) || !("target" in value) || !("top" in value)) return null;
  return (value.href === favoritesHref("all") || value.href === favoritesHref("watching") || value.href === sharedWithYouHref || value.href === savedShareHref(undefined, "declined"))
    && typeof value.target === "string" && typeof value.top === "number" && Number.isFinite(value.top) && value.top >= 0
    ? { href: value.href, target: value.target, top: value.top, artwork: "artwork" in value && value.artwork === true } : null;
}
function restoreListPosition(target?: string, top?: number, artwork = false) {
  const href = window.location.href;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (window.location.href !== href) return;
    const selector = artwork ? "[data-saved-artwork]" : "[data-saved-item]";
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>(selector))
      .find(element => (artwork ? element.dataset.savedArtwork : element.dataset.savedItem) === target);
    if (top !== undefined) window.scrollTo({ top, behavior: "instant" });
    if (!button) return;
    button.focus({ preventScroll: true });
    revealBelowHeader(button);
  }));
}

export function FavoritesView({ availability, hiddenSlugs, initialAlerts, emailEnabled, initialShares, sharesIncomplete, initialTab = "favorites", initialShareId, initialItem, initialSharedView = "available", initialFavoriteFilter = "all" }: Props) {
  const timeZone = useAccountTimeZone();
  const { slugs: savedSlugs, available, toggle, busySlugs: favoriteBusy } = useFavorites();
  const hidden = useMemo(() => new Set(hiddenSlugs), [hiddenSlugs]);
  const slugs = useMemo(() => savedSlugs.filter(slug => !hidden.has(slug)), [savedSlugs, hidden]);
  const [tab, setTab] = useState(initialTab);
  const [favoriteFilter, setFavoriteFilter] = useState(initialFavoriteFilter);
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
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const unavailableShareHeading = useRef<HTMLHeadingElement>(null);
  const unavailableFavoriteHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!requestedShareUnavailable) return;
    const frame = requestAnimationFrame(() => {
      const heading = unavailableShareHeading.current;
      heading?.scrollIntoView?.({ block: "start" });
      heading?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [requestedShareUnavailable, selection?.shareId]);
  const selectedSlug = selectedShare?.slug ?? (selection?.slug && slugs.includes(selection.slug) ? selection.slug : null);
  const requestedFavoriteUnavailable = Boolean(tab === "favorites" && available && selection?.slug && !slugs.includes(selection.slug));
  useLayoutEffect(() => {
    if (!requestedFavoriteUnavailable) return;
    const frame = requestAnimationFrame(() => {
      const heading = unavailableFavoriteHeading.current;
      heading?.focus({ preventScroll: true });
      if (heading) revealBelowHeader(heading);
    });
    return () => cancelAnimationFrame(frame);
  }, [requestedFavoriteUnavailable, selection?.slug]);
  const latestAlerts = useRef(initialAlerts);
  useEffect(() => { latestAlerts.current = initialAlerts; }, [initialAlerts]);
  const [alertOverrides, setAlertOverrides] = useState<Record<string, boolean>>({});
  const alerts = useMemo(() => ({ ...initialAlerts, ...alertOverrides }), [initialAlerts, alertOverrides]);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const tabs = useRef<HTMLDivElement>(null);
  const listPosition = useRef<ListPosition | null>(null);
  const [skipFreshLanding, setSkipFreshLanding] = useState(false);
  const shareSnapshot = useRef(initialShares);
  useLayoutEffect(() => { shareSnapshot.current = initialShares; }, [initialShares]);

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
  function location(href: string, push = false) {
    if (push && new URL(href, window.location.origin).href !== window.location.href) window.history.pushState(null, "", href);
    else window.history.replaceState(null, "", href);
  }
  function revealHeading() { requestAnimationFrame(() => document.getElementById("saved-items-heading")?.scrollIntoView?.({ block: "start", behavior: "instant" })); }
  function chooseTab(next: "favorites" | "shared") {
    listPosition.current = null;
    setSkipFreshLanding(false);
    setTab(next); setSelected(null); setMessage(""); location(next === "shared" ? savedShareHref(undefined, sharedView) : favoritesHref(favoriteFilter), true);
    revealHeading();
  }
  function chooseFavoriteFilter(next: FavoriteFilter) {
    setFavoriteFilter(next);
    if (next !== favoriteFilter) location(favoritesHref(next), true);
  }
  function chooseSharedView(next: SharedView) {
    listPosition.current = null;
    setSharedView(next); setSelected(null); setMessage("");
    location(savedShareHref(undefined, next), true);
  }
  function isViewingShare(id: string) {
    return window.location.pathname === "/account/favorites" && new URLSearchParams(window.location.search).get("share") === id;
  }
  function applyShareResult(id: string, result: Awaited<ReturnType<typeof setReceivedProductState>>, viewedOnly = false) {
    if (!result.ok) {
      if (!viewedOnly || isViewingShare(id)) setMessage(result.message);
      return;
    }
    setShareOverrides(current => ({ ...current, [id]: { ...current[id], viewedAt: result.viewedAt, ...(!viewedOnly ? { declinedAt: result.declinedAt } : {}) } }));
    window.dispatchEvent(new Event("zero-loss-notifications-read"));
  }
  useEffect(() => {
    if (!initialShareId || !initialShares?.some(s => s.id === initialShareId && !hidden.has(s.slug))) return;
    let active = true;
    void setReceivedProductState(initialShareId, "viewed").then(result => { if (active) applyShareResult(initialShareId, result, true); })
      .catch(() => { if (active && isViewingShare(initialShareId)) setMessage("The item is available, but its viewed status could not be saved."); });
    return () => { active = false; };
  }, [initialShareId]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    listPosition.current = savedListPosition(window.history.state);
    function restoreHistory(state: unknown, restoreScroll: boolean) {
      if (window.location.pathname !== "/account/favorites") return;
      const query = new URLSearchParams(window.location.search);
      const nextTab = query.get("tab") === "shared" ? "shared" : "favorites";
      const shareId = nextTab === "shared" ? query.get("share") : null;
      const nextView = shareId && shareId === initialShareId ? initialSharedView : query.get("view") === "declined" ? "declined" : "available";
      const nextFavoriteFilter = query.get("watch") === "1" ? "watching" : "all";
      const slug = query.get("item")?.toLowerCase();
      const nextSelected = shareId ? { shareId }
        : nextTab === "favorites" && slug ? { slug } : null;
      const previousPosition = listPosition.current;
      setSkipFreshLanding(restoreScroll && !nextSelected && Boolean(previousPosition));
      listPosition.current = savedListPosition(state);
      setTab(nextTab); setSharedView(nextView); setSelected(nextSelected); setMessage("");
      if (nextTab === "favorites") setFavoriteFilter(nextFavoriteFilter);
      if (!restoreScroll) return;
      if (!nextSelected && previousPosition?.href === (nextTab === "shared" ? savedShareHref(undefined, nextView) : favoritesHref(nextFavoriteFilter))) {
        restoreListPosition(previousPosition.target, previousPosition.top, previousPosition.artwork);
      }
    }
    // A restored Next.js page can mount after popstate using the cached list's
    // props. The browser location still carries the exact item it returned to.
    const params = new URLSearchParams(window.location.search);
    if (listPosition.current || params.has("item") || params.has("share") || params.has("view") || params.has("watch")) restoreHistory(window.history.state, false);
    const onPopState = (event: PopStateEvent) => restoreHistory(event.state, true);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialShareId, initialSharedView]);
  useLayoutEffect(() => {
    if (!selectedSlug) return;
    const frame = requestAnimationFrame(() => {
      const heading = detailHeading.current;
      if (!heading) return;
      const header = Math.max(0, document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0);
      heading.focus({ preventScroll: true });
      window.scrollTo({ top: Math.max(0, window.scrollY + heading.getBoundingClientRect().top - header - 12), behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedSlug, selectedShare?.id]);
  function openItem(slug: string, shareId?: string, artwork = false) {
    listPosition.current = { href: tab === "shared" ? savedShareHref(undefined, sharedView) : favoritesHref(favoriteFilter), target: shareId ?? slug, top: window.scrollY, artwork };
    setSelected(shareId ? { shareId } : { slug }); setMessage("");
    // Keep the list in history; Next.js copies its router state into this entry.
    window.history.pushState({ zeroLossFavoritesReturn: listPosition.current }, "", shareId ? savedShareHref(shareId, sharedView) : favoritesHref(favoriteFilter, slug));
    if (shareId) void setReceivedProductState(shareId, "viewed").then(result => applyShareResult(shareId, result, true))
      .catch(() => { if (isViewingShare(shareId)) setMessage("The item is available, but its viewed status could not be saved."); });
  }
  function back(keepCurrentView = false) {
    const target = selection?.shareId ?? selection?.slug;
    const nextView = keepCurrentView || !selectedShare ? sharedView : selectedShare.declinedAt ? "declined" : "available";
    const href = tab === "shared" ? savedShareHref(undefined, nextView) : favoritesHref(favoriteFilter);
    if (savedListPosition(window.history.state)?.href === href) {
      window.history.back();
      return;
    }
    // A directly opened item may have no list behind it in this tab.
    setSkipFreshLanding(true);
    setSelected(null);
    if (tab === "shared") setSharedView(nextView);
    location(href);
    restoreListPosition(target);
  }
  async function changeShare(share: SavedProductShare, state: "declined" | "restore") {
    if (shareBusy) return;
    const previewHref = window.location.href;
    const snapshotAtStart = shareSnapshot.current;
    setShareBusy(share.id); setMessage("");
    try {
      let result = await setReceivedProductState(share.id, state);
      if (result.ok && shareSnapshot.current !== snapshotAtStart) {
        const beforeRead = shareSnapshot.current;
        const verified = await readReceivedProductState(share.id).catch(() => null);
        const latest = (shareSnapshot.current === beforeRead ? verified : null) ?? shareSnapshot.current?.find(value => value.id === share.id);
        if (latest && latest.declinedAt !== result.declinedAt) {
          if (window.location.href === previewHref) {
            setSharedView(latest.declinedAt ? "declined" : "available");
            location(savedShareHref(share.id, latest.declinedAt ? "declined" : "available"));
          }
          setShareOverrides(current => ({ ...current, [share.id]: { declinedAt: latest.declinedAt, viewedAt: latest.viewedAt } }));
          setMessage("This share was updated in another tab.");
          return;
        }
        if (latest) result = { ...result, ...latest };
      }
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
    const enabled = !alerts[slug];
    const startingSnapshot = latestAlerts.current;
    setBusySlug(slug); setMessage("");
    startTransition(async () => {
      try {
        const result = await setFavoriteCapacityAlert(slug, enabled);
        if (!result.ok) { setMessage(result.message); return; }
        let saved = enabled;
        if (latestAlerts.current !== startingSnapshot && Boolean(latestAlerts.current?.[slug]) !== enabled) {
          const confirmed = await readFavoriteCapacityAlert(slug);
          if (confirmed === null) { setMessage("The alert changed in another tab. Refresh to check the saved setting."); return; }
          saved = confirmed;
        }
        setAlertOverrides(current => ({ ...current, [slug]: saved }));
        setMessage(saved === enabled ? result.message : "This alert changed in another tab. The current setting is shown.");
      }
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
      {large ? artwork : <button type="button" className={styles.artButton} aria-label={`View ${product?.title ?? "shared product"}`} data-saved-artwork={shareId ?? slug} onClick={() => openItem(slug, shareId, true)}>{artwork}</button>}
      <FavoriteButton itemName={product?.title ?? "this product"} itemHref={`/items/${slug}`} size="large" className={styles.heart} />
    </div>;
  }
  function price(slug: string, large = false) {
    const { product, entryPriceCents, status } = productState(slug);
    if (!product) return null;
    return <div className={`${styles.price} ${large ? styles.detailPrice : ""}`}><span><strong>${(entryPriceCents / 100).toFixed(2)}</strong>per entry</span>
      <span className={styles.remaining} style={{ color: status ? lightSurfaceAvailabilityColor(status.percentFilled) : undefined }}>{status?.remaining === 0 ? "Pool full" : <><strong>{status?.remaining.toLocaleString()}</strong> left</>}</span></div>;
  }
  function sender(share: SavedProductShare) {
    return <div className={styles.sender}><span aria-hidden="true">{share.sender[0]?.toUpperCase() ?? "?"}</span><div>From {share.sender}<small>{share.demo ? "Demo share · " : ""}{new Date(share.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone })}</small></div></div>;
  }
  const missingFavoriteSlug = tab === "favorites" && available && !selectedSlug ? selection?.slug : undefined;
  const missingFavorite = missingFavoriteSlug ? productState(missingFavoriteSlug) : null;
  const { product: detailProduct, entryPriceCents: detailEntryPrice, status: detailStatus } = productState(selectedSlug ?? "");
  const showFavoriteFilters = available && initialAlerts !== null && slugs.length > 0;
  const watchedSlugs = showFavoriteFilters ? slugs.filter(slug => {
    if (!alerts[slug]) return false;
    const { product, status } = productState(slug);
    return Boolean(product) && status?.remaining !== 0;
  }) : [];
  const watching = showFavoriteFilters && favoriteFilter === "watching";
  const visibleFavorites = watching ? watchedSlugs : slugs;
  const detailHref = detailProduct && detailStatus?.remaining !== 0 ? productHrefWithBrowseReturn(detailProduct.slug, selectedShare ? savedShareHref(selectedShare.id, selectedShare.declinedAt ? "declined" : "available") : favoritesHref(favoriteFilter, detailProduct.slug))
    + (selectedShare?.token ? `&share=${selectedShare.token}` : "") : null;
  return <section className={styles.page} aria-labelledby="saved-items-heading">
    <FavoritesLandingScroll enabled={!selectedSlug && !skipFreshLanding && !requestedShareUnavailable && !requestedFavoriteUnavailable} />
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
              <p className={styles.merchant}>{detailProduct?.retailer ?? "Zero Loss"}</p><h2 tabIndex={-1} ref={detailHeading}>{detailProduct?.title ?? selectedShare?.title ?? "Product unavailable"}</h2>
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
            <h2 ref={unavailableFavoriteHeading} tabIndex={-1}>This prize is unavailable in your Favorites</h2>
            <button type="button" className={styles.back} onClick={() => back()}>Back to Favorites</button>
            {missingFavorite.product && !hidden.has(missingFavorite.product.slug) && (missingFavorite.status?.remaining ?? 0) > 0 ? <Link href={`/items/${missingFavorite.product.slug}`}>View prize →</Link> : null}
          </div> : null}
          {emailEnabled === false ? <p className={styles.notice}>Favorite emails are paused in <Link href="/account/notifications#favorite-alert-preference">Notifications</Link>.</p> : null}
          {initialAlerts === null || emailEnabled === null ? <p role="status" className={styles.notice}>Alert choices are unavailable. Your saved items are unchanged.</p> : null}
          {showFavoriteFilters ? <>
            <div className={styles.listFilters} role="group" aria-label="Filter favorites">
              <button type="button" aria-pressed={!watching} onClick={() => chooseFavoriteFilter("all")}>All <span>{slugs.length}</span></button>
              <button type="button" aria-pressed={watching} onClick={() => chooseFavoriteFilter("watching")}>Watching <span>{watchedSlugs.length}</span></button>
            </div>
            <p className={styles.note} aria-live="polite">{watching
              ? `${watchedSlugs.length} ${watchedSlugs.length === 1 ? "favorite" : "favorites"} with 90% email alerts selected`
              : `${slugs.length} ${slugs.length === 1 ? "favorite" : "favorites"}`}</p>
          </> : null}
          {!available ? <p role="alert" className={styles.empty}>Favorites couldn’t be loaded. Refresh to try again; nothing has been removed.</p>
            : !slugs.length ? <div className={styles.empty}><h2>No favorites yet</h2><p>Tap a product’s heart to keep it here.</p><Link href="/browse">Browse products →</Link></div>
            : !visibleFavorites.length ? <div className={styles.empty}><h2>No watched favorites</h2><p>Select All to find a favorite and turn on its 90% email alert.</p></div>
              : <div id="favorite-products" aria-label="Favorite products" className={styles.grid}>{visibleFavorites.map(slug => {
                const { product, status } = productState(slug);
                return <article key={slug} className={styles.card}>{art(slug)}
                  <div className={styles.cardBody}><p className={styles.merchant}>{product?.retailer ?? "Zero Loss"}</p><h2><button type="button" data-saved-item={slug} onClick={() => openItem(slug)}>{product?.title ?? "Product unavailable"}</button></h2>{price(slug)}</div>
                  {product && status?.remaining !== 0 ? <label className={styles.alert}><input type="checkbox" checked={Boolean(alerts[slug])} disabled={!initialAlerts || emailEnabled === null || pending || busySlug !== null} onChange={() => toggleAlert(slug)} aria-label={`Email me when ${product.title} is almost full`} />Email me at 90% full</label>
                    : product ? <p className={styles.alert}>This pool is full; watchlist email unavailable.</p> : null}
                </article>;
              })}</div>}
        </> : <>
          <div className={styles.listFilters} role="group" aria-label="Shared prize status">
            <button type="button" aria-pressed={sharedView === "available"} onClick={() => chooseSharedView("available")}>Available <span>{initialShares ? shares.length - declinedCount : "–"}</span></button>
            <button type="button" aria-pressed={sharedView === "declined"} onClick={() => chooseSharedView("declined")}>Declined <span>{initialShares ? declinedCount : "–"}</span></button>
          </div>
          <p className={styles.note}>{sharedView === "declined" ? "Shares you declined. Reopen a prize while its pool is still available." : "Open prizes shared with you. Declined shares are in the Declined view."}</p>
          {sharesIncomplete ? <p role="status" className={styles.notice}>Some shared prizes or their status could not be verified. <a href={savedShareHref(undefined, sharedView)}>Check shared prizes again</a></p> : null}
          {requestedShareUnavailable ? <div role="status" className={styles.empty}><h2 ref={unavailableShareHeading} tabIndex={-1} style={{ scrollMarginTop: "calc(var(--site-header-height, 149px) + 12px)" }}>This shared prize is no longer available</h2><p>You can browse other prizes or view any other available items shared with you.</p><Link href="/browse">Browse products →</Link></div> : null}
          {initialShares === null ? <p role="alert" className={styles.empty}>Shared items couldn’t be loaded. Refresh to try again; nothing has been removed.</p>
            : !visibleShares.length ? requestedShareUnavailable || sharesIncomplete ? null : <div className={styles.empty}><h2>{!shares.length && sharedView === "available" ? "Nothing shared with you yet" : sharedView === "declined" ? "No declined shares" : "No available shares"}</h2><p>{sharedView === "declined" ? "Shares you decline appear here while their pools remain open." : declinedCount ? "Check Declined to revisit a share." : "Items people send you will appear here."}</p></div>
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
