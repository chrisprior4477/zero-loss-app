import type { KeyboardEvent } from "react";

/** Keep keyboard navigation inside an open modal, including the last Tab. */
export function containDialogTab(event: KeyboardEvent<HTMLElement>) {
  const dialog = event.currentTarget;
  if (event.key !== "Tab" || !(dialog.matches(":modal") || dialog.getAttribute("aria-modal") === "true")) return;
  const controls = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex='0']"))
    .filter(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
  const first = controls[0]; const last = controls.at(-1);
  if (!first || !last) { event.preventDefault(); return; }
  if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}

/** Keep the trigger focused after the browser settles its Back navigation. */
export function restoreDialogTrigger(trigger?: HTMLElement | null) {
  if (!trigger?.isConnected) return;
  const href = window.location.href;
  const fragment = document.getElementById(window.location.hash.slice(1));
  trigger.focus({ preventScroll: true });
  function restoreIfLost() {
    const active = document.activeElement;
    // Native hash restoration can focus the containing section after popstate.
    const focusWasLost = active === document.body || (active === fragment && fragment?.contains(trigger ?? null));
    if (trigger?.isConnected && window.location.href === href && focusWasLost
      && !document.querySelector("dialog[open], [role=dialog][aria-modal=true]")) trigger.focus({ preventScroll: true });
  }
  requestAnimationFrame(restoreIfLost);
  window.setTimeout(restoreIfLost, 100);
}
