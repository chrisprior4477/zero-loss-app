"use client";

import { useState } from "react";
import { isEntryQuantity } from "@/lib/entries/quantity";
import styles from "./entry-quantity-input.module.css";

export function EntryQuantityInput({ value, maximum, disabled, label, testId, onChange }: {
  value: number; maximum: number; disabled?: boolean; label: string; testId?: string;
  onChange: (quantity: number, clamped?: boolean) => void;
}) {
  // Keep a temporarily empty field editable without treating it as a new quantity.
  const [draft, setDraft] = useState<{ base: number; text: string } | null>(null);
  const display = draft?.base === value ? draft.text : String(value);
  return <input type="text" role="spinbutton" inputMode="numeric" pattern="[0-9]*"
    aria-label={label} aria-valuemin={1} aria-valuemax={maximum} aria-valuenow={value}
    autoComplete="off" spellCheck={false} disabled={disabled} value={display}
    data-testid={testId} className={styles.input}
    onFocus={event => event.currentTarget.select()}
    onChange={event => {
      const text = event.currentTarget.value;
      if (!/^[0-9]*$/.test(text)) return;
      if (text === "" || /^0+$/.test(text)) { setDraft({ base: value, text }); return; }
      const next = Number(text);
      if (!isEntryQuantity(next) || maximum < 1) return;
      const clamped = next > maximum;
      setDraft(null);
      onChange(clamped ? maximum : next, clamped);
    }}
    onBlur={() => setDraft(null)}
    onKeyDown={event => {
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        setDraft(null);
        event.currentTarget.blur();
      } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        setDraft(null);
        onChange(Math.max(1, Math.min(maximum, value + (event.key === "ArrowUp" ? 1 : -1))));
      }
    }} />;
}
