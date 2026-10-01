"use client";

import Image from "next/image";
import { useState } from "react";
import type { DemoProduct } from "@/lib/catalog/demo-products";
import { FavoriteButton } from "@/components/ui/FavoriteButton";

export function ProductGallery({ gallery, title, slug }: Pick<DemoProduct, "gallery" | "title" | "slug">) {
  const [selected, setSelected] = useState(0);
  const image = gallery[selected];

  return (
    <div>
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-white/15 bg-white shadow-[0_24px_70px_rgba(0,0,0,.2)] sm:aspect-[4/3]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 768px) 100vw, 54vw"
          className={image.fit === "cover" ? "object-cover" : image.fit === "reward" ? "object-contain p-2 sm:p-3" : "object-contain p-5 sm:p-9"}
        />
        <FavoriteButton itemName={title} itemHref={`/items/${slug}`} size="large" className="absolute right-3 top-3 z-10 sm:right-5 sm:top-5" />
      </div>
      {gallery.length > 1 ? <div className="mt-2 flex gap-2 overflow-x-auto pb-1 sm:mt-3 sm:gap-3" aria-label={`${title} image gallery`}>
        {gallery.map((galleryImage, index) => (
          <button
            key={`${galleryImage.src}-${index}`}
            type="button"
            onClick={() => setSelected(index)}
            aria-label={`Show image ${index + 1} of ${gallery.length}`}
            aria-pressed={selected === index}
            className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-white transition sm:h-20 sm:w-24 ${selected === index ? "ring-3 ring-cyan-300" : "border border-white/25 opacity-75 hover:opacity-100"}`}
          >
            <Image src={galleryImage.src} alt="" fill sizes="(max-width: 640px) 64px, 96px" className={galleryImage.fit === "reward" ? "object-contain p-1" : "object-contain p-2"} />
          </button>
        ))}
      </div> : null}
    </div>
  );
}
