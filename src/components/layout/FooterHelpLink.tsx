"use client";

import Link from "next/link";

export const activityHelpReturnKey = "zeroLossActivityFooterHelp";

export function FooterHelpLink({ className }: { className: string }) {
  return <Link id="footer-help-center" href="/support" className={className} data-footer-return onNavigate={() => {
    if (location.pathname !== "/account/entries") return;
    history.replaceState({
      ...history.state,
      [activityHelpReturnKey]: { href: location.href, top: scrollY },
    }, "");
  }}>Help Center</Link>;
}
