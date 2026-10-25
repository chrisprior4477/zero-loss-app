"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { ProductShareButton } from "@/components/product/ProductShareButton";
import { useFavorites } from "./FavoritesProvider";
import { FavoritesLandingScroll } from "./FavoritesLandingScroll";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { availabilityStatus, type AvailabilitySnapshot } from "@/lib/catalog/availability";
import { setFavoriteCapacityAlert } from "@/lib/favorites/alert-actions";
import { savedShareHref, savedShareStatus, sharedWithYouHref, type SavedProductShare } from "@/lib/sharing/saved-shares";
import { setReceivedProductState } from "@/lib/sharing/saved-share-actions";
import styles from "./favorites.module.css";

type Props = {
  availability: AvailabilitySnapshot | null; initialAlerts: Record<string, boolean> | null; emailEnabled: boolean | null;
  initialShares: SavedProductShare[] | null; initialTab?: "favorites" | "shared"; initialShareId?: string; initialItem?: string;
};
type Selection = { slug: string; shareId?: string } | null;
export function FavoritesView({ availability, initialAlerts, emailEnabled, initialShares, initialTab = "favorites", initialShareId, initialItem }: Props) {
  const { slugs, available, toggle, busySlug: favoriteBusy } = useFavorites();
  const [tab, setTab] = useState(initialTab);
  const [shares, setShares] = useState(initialShares ?? []);
  const [selected, setSelected] = useState<Selection>(() => {
    const share = initialShares?.find(s => s.id === initialShareId);
    return share ? { slug: share.slug, shareId: share.id } : initialTab === "favorites" && initialItem && slugs.includes(initialItem) ? { slug: initialItem } : null;
  });
  const [alerts, setAlerts] = useState(initialAlerts ?? {});
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const tabs = useRef<HTMLDivElement>(null);
  function location(href: string) { window.history.replaceState(window.history.state, "", href); }
  function revealHeading() { requestAnimationFrame(() => document.getElementById("saved-items-heading")?.scrollIntoView?.({ block: "start", behavior: "instant" })); }
  function chooseTab(next: "favorites" | "shared") {
    setTab(next); setSelected(null); setMessage(""); location(next === "shared" ? sharedWithYouHref : "/account/favorites");
    revealHeading();
  }
  function applyShareResult(id: string, result: Awaited<ReturnType<typeof setReceivedProductState>>, viewedOnly = false) {
    if (!result.ok) { setMessage(result.message); return; }
    setShares(current => current.map(s => s.id === id ? { ...s, viewedAt: result.viewedAt, declinedAt: viewedOnly ? s.declinedAt : result.declinedAt } : s));
    window.dispatchEvent(new Event("zero-loss-notifications-read"));
  }
  useEffect(() => {
    if (!initialShareId || !initialShares?.some(s => s.id === initialShareId)) return;
    let active = true;
    void setReceivedProductState(initialShareId, "viewed").then(result => { if (active) applyShareResult(initialShareId, result, true); })
      .catch(() => { if (active) setMessage("The item is available, but its viewed status could not be saved."); });
    return () => { active = false; };
  }, [initialShareId]); // eslint-disable-line react-hooks/exhaustive-deps
  function openItem(slug: string, shareId?: string) {
    setSelected({ slug, shareId }); setMessage("");
    location(shareId ? savedShareHref(shareId) : `/account/favorites?item=${encodeURIComponent(slug)}`);
    revealHeading();
    if (shareId) void setReceivedProductState(shareId, "viewed").then(result => applyShareResult(shareId, result, true))
      .catch(() => setMessage("The item is available, but its viewed status could not be saved."));
  }
  function back() {
    const target = selected?.shareId ?? selected?.slug;
    setSelected(null); location(tab === "shared" ? sharedWithYouHref : "/account/favorites");
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-saved-item="${target}"]`)?.focus({ preventScroll: true }));
  }
  async function changeShare(share: SavedProductShare, state: "declined" | "restore") {
    if (shareBusy) return;
    setShareBusy(share.id); setMessage("");
    try { const result = await setReceivedProductState(share.id, state); applyShareResult(share.id, result); if (result.ok) { setMessage(result.message); back(); } }
    catch { setMessage("We couldn’t confirm this change. Please try again."); }
    finally { setShareBusy(null); }
  }
  function toggleAlert(slug: string) {
    if (busySlug || !initialAlerts || emailEnabled === null) return;
    const enabled = !alerts[slug]; setBusySlug(slug); setMessage("");
    startTransition(async () => {
      try { const result = await setFavoriteCapacityAlert(slug, enabled); if (result.ok) setAlerts(current => ({ ...current, [slug]: enabled })); setMessage(result.message); }
      catch { setMessage("We couldn’t confirm this change. Refresh and try again."); }
      finally { setBusySlug(null); }
    });
  }
  function productState(slug: string) {
    const product = getDemoProduct(slug), current = availability?.[slug];
    return { product, current, status: product ? availabilityStatus(current?.capacity ?? product.capacity, current?.sold ?? product.sold) : null };
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
    const { product, current, status } = productState(slug);
    if (!product) return null;
    return <div className={`${styles.price} ${large ? styles.detailPrice : ""}`}><span><strong>${((current?.entryPriceCents ?? product.entryPrice * 100) / 100).toFixed(2)}</strong>per entry</span>
      <span className={styles.remaining} style={{ color: status?.color }}>{status?.remaining === 0 ? "Pool full" : <><strong>{status?.remaining.toLocaleString()}</strong> left</>}</span></div>;
  }
  function sender(share: SavedProductShare) {
    return <div className={styles.sender}><span aria-hidden="true">{share.sender[0]?.toUpperCase() ?? "?"}</span><div>From {share.sender}<small>{share.demo ? "Demo share · " : ""}{new Date(share.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}</small></div></div>;
  }
  const selectedShare = selected?.shareId ? shares.find(s => s.id === selected.shareId) : null;
  const detailProduct = selected ? getDemoProduct(selected.slug) : null;
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
        {selected ? <>
          <button type="button" className={styles.back} onClick={back}>← {tab === "shared" ? "Shared with You" : "Your Favorites"}</button>
          <article className={styles.detail}>
            {selectedShare ? sender(selectedShare) : null}{art(selected.slug, true)}
            <div className={styles.detailBody}>
              <p className={styles.merchant}>{detailProduct?.retailer ?? "Zero Loss"}</p><h2>{detailProduct?.title ?? selectedShare?.title ?? "Product unavailable"}</h2>
              {selectedShare ? <span className={`${styles.badge} ${selectedShare.declinedAt ? styles.declined : ""}`}>{savedShareStatus(selectedShare)}</span> : null}
              {price(selected.slug, true)}
              {detailProduct ? <Link className={styles.productLink} href={`/items/${detailProduct.slug}${selectedShare?.token ? `?share=${selectedShare.token}` : ""}`}>Open prize details →</Link> : <p>This product is no longer available in the current catalog.</p>}
              <div className={styles.detailActions}>
                <button type="button" className={styles.saveFavorite} disabled={favoriteBusy === selected.slug || !detailProduct || !available} onClick={() => toggle(selected.slug)}>{slugs.includes(selected.slug) ? "♥ Saved to Favorites" : "♡ Save to Favorites"}</button>
                <div>{detailProduct ? <ProductShareButton product={{ slug: detailProduct.slug, title: detailProduct.title, image: detailProduct.gallery[0].src, retailer: detailProduct.retailer, value: detailProduct.value }} label="Share" className={styles.shareButton} /> : null}<button type="button" className={styles.backToList} onClick={back}>Back to list</button></div>
              </div>
              {selectedShare ? <><button type="button" className={styles.declineButton} disabled={shareBusy !== null} onClick={() => void changeShare(selectedShare, selectedShare.declinedAt ? "restore" : "declined")}>{shareBusy === selectedShare.id ? "Saving…" : selectedShare.declinedAt ? "Undo decline" : "Decline this share"}</button><p className={styles.kept}>{selectedShare.declinedAt ? "Declined. This item stays in Shared with You." : "Declining keeps this item here to revisit."}</p></> : null}
            </div>
          </article>
        </> : tab === "favorites" ? <>
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
          <p className={styles.note}>Includes items you’ve declined.</p>
          {initialShares === null ? <p role="alert" className={styles.empty}>Shared items couldn’t be loaded. Refresh to try again; nothing has been removed.</p>
            : !shares.length ? <div className={styles.empty}><h2>Nothing shared with you yet</h2><p>Items people send you will appear here.</p></div>
              : <div aria-label="Items shared with you" className={styles.grid}>{shares.map(share => {
                const product = getDemoProduct(share.slug);
                return <article key={share.id} className={styles.card}>{art(share.slug, false, share.id)}<div className={styles.cardBody}>{sender(share)}<span className={`${styles.badge} ${share.declinedAt ? styles.declined : ""}`}>{savedShareStatus(share)}</span><p className={styles.merchant}>{product?.retailer ?? "Zero Loss"}</p><h2>{product?.title ?? share.title}</h2><button type="button" className={styles.viewButton} data-saved-item={share.id} onClick={() => openItem(share.slug, share.id)}>View prize <span aria-hidden="true">→</span></button></div></article>;
              })}</div>}
        </>}
      </section>
    </div>
  </section>;
}
