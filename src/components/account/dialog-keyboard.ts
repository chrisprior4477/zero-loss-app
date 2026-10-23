import type { KeyboardEvent } from "react";

/** Keep keyboard navigation inside an open native modal, including the last Tab. */
export function containDialogTab(event: KeyboardEvent<HTMLDialogElement>) {
  const dialog = event.currentTarget;
  if (event.key !== "Tab" || !dialog.matches(":modal")) return;
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
