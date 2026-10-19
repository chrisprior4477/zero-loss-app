"use client";

import { useEffect } from "react";

/** The menu's account shortcut should land on Profile, beneath the sticky site header. */
export function ProfileLandingScroll() {
  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    const revealProfile = () => {
      if (window.location.hash !== "#profile-intro" || !window.matchMedia?.("(max-width: 700px)").matches) return;
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          const profile = document.getElementById("profile-intro");
          if (!profile) return;
          const headerBottom = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
          const top = window.scrollY + profile.getBoundingClientRect().top - headerBottom - 12;
          window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
        });
      });
    };
    revealProfile();
    window.addEventListener("hashchange", revealProfile);
    return () => {
      window.removeEventListener("hashchange", revealProfile);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);
  return null;
}
