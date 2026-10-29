"use client";

import { useEffect, useId, useRef, useState } from "react";
import { demoCardFixture, type DemoCardToken } from "@/lib/payments/demo-card";
import styles from "./funding-card-picker.module.css";

export function FundingCardPicker({ tokens, value, disabled, onChange }: {
  tokens: DemoCardToken[]; value: DemoCardToken | null; disabled: boolean; onChange: (token: DemoCardToken) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const wheel = useRef<HTMLDivElement>(null);
  const lastIndex = useRef(-1);
  const index = value ? tokens.indexOf(value) : -1;
  const selected = demoCardFixture(value);
  useEffect(() => {
    if (open && wheel.current && index >= 0 && lastIndex.current !== index) {
      lastIndex.current = index;
      wheel.current.scrollTop = index * 44;
    }
  }, [index, open]);
  const label = (token: DemoCardToken) => { const card = demoCardFixture(token)!; return `${card.issuer} •••• ${card.lastFour}`; };
  return <div className={styles.picker}>
    <span id={`${id}-label`} className={styles.label}>Current card in use</span>
    <select aria-labelledby={`${id}-label`} className={styles.desktop} value={value ?? ""} disabled={disabled || !tokens.length} onChange={event => onChange(event.target.value as DemoCardToken)}>
      <option value="" disabled>Choose a card</option>
      {tokens.map(token => <option key={token} value={token}>{label(token)}</option>)}
    </select>
    <div className={styles.mobile}>
      <button type="button" className={styles.trigger} disabled={disabled || !tokens.length} aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-wheel`} onClick={() => { lastIndex.current = -1; setOpen(current => !current); }}>
        <span id={`${id}-value`}>{selected ? <><strong>{selected.issuer}</strong><small>Sample card •••• {selected.lastFour}</small></> : "Choose a card"}</span><span aria-hidden="true">{open ? "⌃" : "⌄"}</span>
      </button>
      {open ? <div className={styles.options}>
        <div className={styles.highlight} aria-hidden="true" />
        <div ref={wheel} id={`${id}-wheel`} role="listbox" aria-labelledby={`${id}-label`} aria-activedescendant={index >= 0 ? `${id}-${index}` : undefined} tabIndex={disabled ? -1 : 0} aria-disabled={disabled} className={styles.wheel}
          onScroll={event => { if (disabled) return; const next = Math.min(tokens.length - 1, Math.max(0, Math.round(event.currentTarget.scrollTop / 44))); if (next !== lastIndex.current && tokens[next]) { lastIndex.current = next; onChange(tokens[next]); } }}
          onKeyDown={event => {
            if (event.key === "Escape" || event.key === "Enter") { event.preventDefault(); setOpen(false); return; }
            if (disabled || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? tokens.length - 1 : Math.max(0, Math.min(tokens.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
            onChange(tokens[next]);
          }}>
          {tokens.map((token, itemIndex) => <div key={token} id={`${id}-${itemIndex}`} role="option" aria-selected={token === value} className={styles.option} onClick={() => { if (!disabled) { onChange(token); if (wheel.current) wheel.current.scrollTop = itemIndex * 44; } }}>{label(token)}</div>)}
        </div>
        <button type="button" className={styles.done} onClick={() => setOpen(false)}>Done</button>
      </div> : null}
    </div>
  </div>;
}
