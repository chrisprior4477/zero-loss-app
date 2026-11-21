"use client";

import { useEffect } from "react";

export function DeclinedOfferFilterNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.pathname !== "/account/declined-offers") return;
    url.searchParams.delete("filter");
    window.history.replaceState(window.history.state, "", url);
  }, []);
  return <p role="status" className="mb-4 text-sm text-amber-100">
    That saved filter is unavailable. Returning to My Activity will show all activity.
  </p>;
}
