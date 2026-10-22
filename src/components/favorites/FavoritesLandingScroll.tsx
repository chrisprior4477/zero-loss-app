"use client";

import { useEffect } from "react";

/** Mobile visits land on the saved products, beneath the customer's chosen header. */
export function FavoritesLandingScroll({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let firstFrame = 0;
    let secondFrame = 0;
    const cancel = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
    const canScroll = () => window.matchMedia?.("(max-width: 767px)").matches
      && (!window.location.hash || window.location.hash === "#favorite-products");
    const revealProducts = () => {
      cancel();
      if (!canScroll()) return;
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (!canScroll()) return;
          const products = document.getElementById("favorite-products");
          if (!products) return;
          const headerBottom = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
          const top = window.scrollY + products.getBoundingClientRect().top - headerBottom - 20;
          window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
        });
      });
    };
    revealProducts();
    window.addEventListener("hashchange", revealProducts);
    return () => { cancel(); window.removeEventListener("hashchange", revealProducts); };
  }, [enabled]);
  return null;
}
