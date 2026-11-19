"use client";

import { useEffect, useRef } from "react";

export function ContactHeading() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    function focusHeading() {
      if (window.location.hash === "#contact-intro") heading.current?.focus({ preventScroll: true });
    }
    focusHeading();
    window.addEventListener("hashchange", focusHeading);
    return () => window.removeEventListener("hashchange", focusHeading);
  }, []);

  return <h1 ref={heading} id="contact-intro" tabIndex={-1} className="mt-3 scroll-mt-[calc(var(--site-header-height,149px)+12px)] text-4xl font-black tracking-tight sm:text-5xl">Contact us</h1>;
}
