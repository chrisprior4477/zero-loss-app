"use client";

import Image from "next/image";
import { useState } from "react";
import type { DemoProduct } from "@/lib/catalog/demo-products";

export function ProductGallery({ gallery, title }: Pick<DemoProduct, "gallery" | "title">) {
  const [selected, setSelected] = useState(0);
  const image = gallery[selected];

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/15 bg-white shadow-[0_24px_70px_rgba(0,0,0,.2)]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 54vw"
          className={image.fit === "cover" ? "object-cover" : image.fit === "reward" ? "object-contain p-2 sm:p-3" : "object-contain p-5 sm:p-9"}
        />
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1" aria-label={`${title} image gallery`}>
        {gallery.map((galleryImage, index) => (
          <button
            key={`${galleryImage.src}-${index}`}
            type="button"
            onClick={() => setSelected(index)}
            aria-label={`Show image ${index + 1} of ${gallery.length}`}
            aria-pressed={selected === index}
            className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-white transition ${selected === index ? "ring-3 ring-cyan-300" : "border border-white/25 opacity-75 hover:opacity-100"}`}
          >
            <Image src={galleryImage.src} alt="" fill sizes="96px" className={galleryImage.fit === "reward" ? "object-contain p-1" : "object-contain p-2"} />
          </button>
        ))}
      </div>
    </div>
  );
}
