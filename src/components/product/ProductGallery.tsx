"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import type { DemoProduct } from "@/lib/catalog/demo-products";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { ProductInfoDialog } from "./ProductInfoDialog";
import styles from "./product-entry-layout.module.css";

export function ProductGallery({ gallery, title, slug, signedOutCompact = false, compact = false, productInfo }: Pick<DemoProduct, "gallery" | "title" | "slug"> & { signedOutCompact?: boolean; compact?: boolean; productInfo?: ReactNode }) {
  const [selected, setSelected] = useState(0);
  const image = gallery[selected];

  const picture = <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 768px) 100vw, 54vw"
          className={compact ? image.fit === "cover" ? styles.galleryImageCover : styles.galleryImage : image.fit === "cover" ? "object-cover" : image.fit === "reward" ? "object-contain p-2 sm:p-3" : "object-contain p-5 sm:p-9"}
        />;

  return (
    <div className={compact ? styles.gallery : undefined}>
      <div className={compact ? styles.media : `relative overflow-hidden rounded-3xl border border-white/15 bg-white shadow-[0_24px_70px_rgba(0,0,0,.2)] ${signedOutCompact ? "h-36 min-[480px]:h-64 lg:aspect-[4/3] lg:h-auto" : "aspect-[16/9] sm:aspect-[4/3]"}`}>
        {compact && productInfo ? <ProductInfoDialog title="Product info" triggerLabel={`Product info for ${title}`} variant="ticket" className={styles.imageOpen} label={<>{picture}<span className={styles.productInfoLabel}>Product info</span></>}>
          {productInfo}
        </ProductInfoDialog> : picture}
        {compact && !productInfo ? <ProductInfoDialog title={title} className={styles.imageOpen} label={<span className="sr-only">View pictures of {title}</span>}>
          <Image src={image.src} alt={image.alt} width={1000} height={700} className={styles.enlargedImage} />
          {gallery.length > 1 ? <div className={styles.enlargedThumbs}>{gallery.map((picture, index) => <button key={`${picture.src}-${index}`} type="button" aria-label={`Show enlarged image ${index + 1} of ${gallery.length}`} aria-pressed={selected === index} onClick={() => setSelected(index)}><Image src={picture.src} alt="" fill sizes="70px" className="object-contain p-1" /></button>)}</div> : null}
        </ProductInfoDialog> : null}
        <FavoriteButton itemName={title} itemHref={`/items/${slug}`} size="large" className={`absolute right-3 top-3 z-10 sm:right-5 sm:top-5 ${compact ? styles.favorite : ""}`} />
      </div>
      {gallery.length > 1 ? <div className={compact ? styles.thumbs : signedOutCompact ? "mt-2 flex gap-2 overflow-x-auto pb-1 lg:mt-3 lg:gap-3" : "mt-2 flex gap-2 overflow-x-auto pb-1 sm:mt-3 sm:gap-3"} aria-label={`${title} image gallery`}>
        {gallery.map((galleryImage, index) => (
          <button
            key={`${galleryImage.src}-${index}`}
            type="button"
            onClick={() => setSelected(index)}
            aria-label={`Show image ${index + 1} of ${gallery.length}`}
            aria-pressed={selected === index}
            className={compact ? styles.thumb : `relative shrink-0 overflow-hidden rounded-xl bg-white transition ${signedOutCompact ? "h-10 w-14 lg:h-20 lg:w-24" : "h-12 w-16 sm:h-20 sm:w-24"} ${selected === index ? "ring-3 ring-cyan-300" : "border border-white/25 opacity-75 hover:opacity-100"}`}
          >
            <Image src={galleryImage.src} alt="" fill sizes="(max-width: 640px) 64px, 96px" className={galleryImage.fit === "reward" ? "object-contain p-1" : "object-contain p-2"} />
          </button>
        ))}
      </div> : null}
    </div>
  );
}
