"use client";

import type { Ref } from "react";
import { isEntryQuantity } from "@/lib/entries/quantity";
import styles from "./entry-quantity-input.module.css";

export function EntryQuantityInput({ value, maximum, disabled, label, testId, inputRef, errorId, onChange, invalidDraft, onInvalidDraft }: {
  value: number; maximum: number; disabled?: boolean; label: string; testId?: string; inputRef?: Ref<HTMLInputElement>; errorId?: string;
  invalidDraft: string | null; onInvalidDraft: (draft: string | null) => void;
  onChange: (quantity: number, clamped?: boolean) => void;
}) {
  const display = invalidDraft ?? String(value);
  return <input ref={inputRef} type="text" role="spinbutton" inputMode="numeric" pattern="[0-9]*"
    aria-label={label} aria-valuemin={1} aria-valuemax={maximum} aria-valuenow={invalidDraft === null ? value : undefined} aria-invalid={invalidDraft !== null} aria-describedby={invalidDraft !== null ? errorId : undefined}
    autoComplete="off" spellCheck={false} disabled={disabled} value={display}
    data-testid={testId} className={styles.input}
    onFocus={event => event.currentTarget.select()}
    onChange={event => {
      const text = event.currentTarget.value;
      const next = Number(text);
      if (!/^[0-9]+$/.test(text) || !isEntryQuantity(next) || maximum < 1) {
        onInvalidDraft(text);
        return;
      }
      const clamped = next > maximum;
      onInvalidDraft(null);
      onChange(clamped ? maximum : next, clamped);
    }}
    onKeyDown={event => {
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        if (event.key === "Escape") onInvalidDraft(null);
        if (event.key === "Escape" || invalidDraft === null) event.currentTarget.blur();
      } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        onInvalidDraft(null);
        onChange(Math.max(1, Math.min(maximum, value + (event.key === "ArrowUp" ? 1 : -1))));
      }
    }} />;
}
