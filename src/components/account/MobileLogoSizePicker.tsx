"use client";

import { mobileLogoSizes, mobileLogoSizeLabel } from "@/lib/navigation/mobile-logo-size";
import { useMobileLogoSize } from "@/components/layout/MobileLogoSizeProvider";
import { useMenuLayout } from "@/components/layout/MenuLayoutProvider";
import ticket from "./menu-layout-picker.module.css";
import styles from "./mobile-logo-size-picker.module.css";

export function MobileLogoSizePicker() {
  const choice = useMobileLogoSize();
  const menu = useMenuLayout();
  const changed = choice.size !== choice.savedSize;
  return <section id="personalize-logo" className={`${ticket.ticket} ${styles.mobileOnly}`} aria-labelledby="personalize-logo-heading">
    <span className={ticket.eyebrow}>MAKE IT YOURS</span>
    <h2 id="personalize-logo-heading">Change logo/home button size</h2>
    <p className={ticket.summaryText}>Changes live without changing your menu. Larger logos fit the available header space.</p>
    <div className={styles.savedSize}>Saved: {mobileLogoSizeLabel(choice.savedSize)}</div>
    <fieldset disabled={choice.pending || menu.pending} className={styles.options}>
      <legend className="sr-only">Choose your mobile logo size</legend>
      {mobileLogoSizes.map(size => <label key={size} className={styles.option} data-selected={choice.size === size}>
        <input type="radio" name="mobile-logo-size" checked={choice.size === size} value={size} onChange={() => { menu.dismiss(); choice.preview(size); }} onClick={() => { if (choice.size === size) { menu.dismiss(); choice.preview(size); } }} />
        <span>{mobileLogoSizeLabel(size)}</span>
      </label>)}
    </fieldset>
    <div className={styles.actions}>
      <button type="button" className={ticket.quickSave} disabled={choice.pending || !changed} onClick={choice.save}>{choice.pending ? "Saving…" : "Keep this size"}</button>
      {changed ? <button type="button" className={styles.cancel} disabled={choice.pending} onClick={choice.cancel}>Cancel preview</button> : null}
    </div>
    {choice.message ? <p className={ticket.status} data-error={choice.message.error} role={choice.message.error ? "alert" : "status"}>{choice.message.text}</p> : null}
  </section>;
}
