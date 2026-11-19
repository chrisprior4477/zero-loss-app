/** Keep a compact review centered in the usable viewport; tall content starts below the header. */
export function accountLandingTop(headerBottom: number, viewportHeight: number, contentHeight: number, centered = false): number {
  const top = headerBottom + 12;
  return centered ? top + Math.max(0, (viewportHeight - headerBottom - 24 - contentHeight) / 2) : top;
}

/** Reveal a control or panel if it is clipped by the viewport or sticky navigation. */
export function revealBelowHeader(element: HTMLElement) {
  const { top, bottom } = element.getBoundingClientRect();
  const header = Math.max(0, document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0) + 12;
  const viewportBottom = (window.visualViewport?.height ?? window.innerHeight) - 12;
  if (top >= header && bottom <= viewportBottom) return;
  const delta = top < header ? top - header : Math.min(bottom - viewportBottom, top - header);
  if (Math.abs(delta) > 1) window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: "instant" });
}
