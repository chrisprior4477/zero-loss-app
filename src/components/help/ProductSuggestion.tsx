"use client";

import { useEffect, useRef } from "react";
import { revealBelowHeader } from "@/lib/account/landing-position";
import { CatalogRequestForm } from "@/components/catalog/CatalogRequestForm";

export function ProductSuggestion({ ownerId }: { ownerId?: string }) {
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    let frame = 0;
    const revealTarget = () => {
      if (!panel.current) return;
      if (window.location.hash !== "#product-request") {
        if (window.history.state?.zeroLossContactProductRequest === true) {
          panel.current.open = true;
          const fieldId = window.history.state?.zeroLossContactProductRequestField;
          frame = requestAnimationFrame(() => {
            const field = typeof fieldId === "string" ? document.getElementById(fieldId) : null;
            if (document.activeElement !== document.body || !field || !panel.current?.contains(field)) return;
            field.focus({ preventScroll: true });
            revealBelowHeader(field);
          });
        }
        return;
      }
      panel.current.open = true;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (window.location.hash !== "#product-request") return;
        const field = panel.current?.querySelector<HTMLElement>("#requested-item");
        field?.focus({ preventScroll: true });
        if (field) revealBelowHeader(field);
      });
    };
    revealTarget();
    window.addEventListener("hashchange", revealTarget);
    window.addEventListener("popstate", revealTarget);
    return () => {
      window.removeEventListener("hashchange", revealTarget);
      window.removeEventListener("popstate", revealTarget);
      window.cancelAnimationFrame(frame);
    };
  }, []);
  return <details ref={panel} id="product-request" onToggle={event => {
    if (location.pathname !== "/contact") return;
    window.history.replaceState({ ...window.history.state, zeroLossContactProductRequest: event.currentTarget.open }, "");
  }} onFocusCapture={event => {
    if (location.pathname !== "/contact" || !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) return;
    window.history.replaceState({ ...window.history.state, zeroLossContactProductRequestField: event.target.id }, "");
  }} className="group mt-7 scroll-mt-48 rounded-2xl border border-cyan-300/30 bg-[#082e52] open:border-cyan-300"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 p-5 font-extrabold marker:hidden sm:p-7 [&::-webkit-details-marker]:hidden"><span>Something missing from the marketplace?<span className="mt-1 block text-sm font-normal text-white/65">Suggest a product or retailer without leaving this page.</span></span><span aria-hidden="true" className="text-2xl text-cyan-300 group-open:rotate-45">+</span></summary><div className="max-w-2xl px-5 pb-6 sm:px-7"><CatalogRequestForm ownerId={ownerId} /></div></details>;
}
