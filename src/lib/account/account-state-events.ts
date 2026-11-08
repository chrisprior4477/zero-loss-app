"use client";

export const ACCOUNT_CHANGED_EVENT = "zero-loss-account-changed";
export const ACCOUNT_REFRESH_RELEASED_EVENT = "zero-loss-account-refresh-released";

let refreshHolds = 0;

/** Keep an in-flight receipt/Undo visible; refresh from the server once it closes. */
export function holdAccountRefresh() {
  refreshHolds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    refreshHolds -= 1;
    if (!refreshHolds) window.dispatchEvent(new Event(ACCOUNT_REFRESH_RELEASED_EVENT));
  };
}

export function isAccountRefreshHeld() { return refreshHolds > 0; }

export function notifyAccountChanged() {
  window.dispatchEvent(new Event(ACCOUNT_CHANGED_EVENT));
}
