/** Keep a compact review centered in the usable viewport; tall content starts below the header. */
export function accountLandingTop(headerBottom: number, viewportHeight: number, contentHeight: number, centered = false): number {
  const top = headerBottom + 12;
  return centered ? top + Math.max(0, (viewportHeight - headerBottom - 24 - contentHeight) / 2) : top;
}
