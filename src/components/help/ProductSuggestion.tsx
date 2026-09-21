"use client";

import { useEffect, useRef } from "react";
import { CatalogRequestForm } from "@/components/catalog/CatalogRequestForm";

export function ProductSuggestion() {
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    let frame = 0;
    const revealTarget = () => {
      if (window.location.hash !== "#product-request" || !panel.current) return;
      panel.current.open = true;
      frame = window.requestAnimationFrame(() => panel.current?.scrollIntoView({ block: "start" }));
    };
    revealTarget();
    window.addEventListener("hashchange", revealTarget);
    return () => { window.removeEventListener("hashchange", revealTarget); window.cancelAnimationFrame(frame); };
  }, []);
  return <details ref={panel} id="product-request" className="group mt-7 scroll-mt-48 rounded-2xl border border-cyan-300/30 bg-[#082e52] open:border-cyan-300"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 p-5 font-extrabold marker:hidden sm:p-7 [&::-webkit-details-marker]:hidden"><span>Something missing from the marketplace?<span className="mt-1 block text-sm font-normal text-white/65">Suggest a product or retailer without leaving this page.</span></span><span aria-hidden="true" className="text-2xl text-cyan-300 group-open:rotate-45">+</span></summary><div className="max-w-2xl px-5 pb-6 sm:px-7"><CatalogRequestForm /></div></details>;
}
