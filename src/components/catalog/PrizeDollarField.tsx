"use client";

import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { MAX_PRIZE_VALUE } from "@/lib/catalog/browse-filters";
import styles from "./prize-dollar-field.module.css";

const ROW_HEIGHT = 48;
const WINDOW_SPAN = 200;
const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const windowStart = (amount: number) => Math.max(0, Math.min(MAX_PRIZE_VALUE - WINDOW_SPAN, amount - WINDOW_SPAN / 2));

function DollarWheel({ label, initial, onSave, onCancel }: {
  label: string; initial: number; onSave: (value: string) => void; onCancel: () => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const position = useRef(initial);
  const [amount, setAmount] = useState(initial);
  const [start, setStart] = useState(() => windowStart(initial));

  useLayoutEffect(() => {
    const element = dialog.current!;
    element.showModal();
    wheel.current?.focus({ preventScroll: true });
    return () => element.close();
  }, []);

  useLayoutEffect(() => {
    if (wheel.current) wheel.current.scrollTop = (position.current - start) * ROW_HEIGHT;
  }, [start]);

  function select(next: number) {
    const value = Math.max(0, Math.min(MAX_PRIZE_VALUE, next));
    position.current = value;
    setAmount(value);
    // Shift a small window of rows as needed, including at the two endpoints.
    if (value < start + 10 || value > start + WINDOW_SPAN - 10) {
      const newStart = windowStart(value);
      if (newStart !== start) { setStart(newStart); return; }
    }
    if (wheel.current) wheel.current.scrollTop = (value - start) * ROW_HEIGHT;
  }

  function visibleAmount(element: HTMLDivElement) {
    return start + Math.min(WINDOW_SPAN, Math.max(0, Math.round(element.scrollTop / ROW_HEIGHT)));
  }

  return <dialog ref={dialog} aria-labelledby={id} className={styles.dialog}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onCancel(); }}
    onClick={event => { if (event.target === event.currentTarget) onCancel(); }}
    onKeyDown={event => event.stopPropagation()}>
    <div className={styles.panel}>
      <h3 id={id}>{label}</h3>
      <div className={styles.frame} style={{ "--row": `${ROW_HEIGHT}px` } as CSSProperties}>
        <div ref={wheel} tabIndex={0} role="listbox" aria-labelledby={id}
          aria-activedescendant={`${id}-${amount}`} className={styles.wheel}
          onScroll={event => {
            const next = visibleAmount(event.currentTarget);
            position.current = next;
            setAmount(next);
            if (next < start + 10 || next > start + WINDOW_SPAN - 10) setStart(windowStart(next));
          }}
          onKeyDown={event => {
            const steps: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, PageUp: -10, PageDown: 10 };
            if (event.key === "Enter") { event.preventDefault(); onSave(String(visibleAmount(event.currentTarget))); return; }
            if (!(event.key in steps) && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault();
            select(event.key === "Home" ? 0 : event.key === "End" ? MAX_PRIZE_VALUE : amount + steps[event.key]);
          }}>
          {Array.from({ length: WINDOW_SPAN + 1 }, (_, index) => {
            const value = start + index;
            return <div role="option" key={value} id={`${id}-${value}`} aria-selected={value === amount}
              className={styles.row} onClick={() => select(value)}>{formatter.format(value)}</div>;
          })}
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" className={styles.done} onClick={() => onSave(String(visibleAmount(wheel.current!)))}>Done</button>
      </div>
      <button type="button" className={styles.clear} onClick={() => onSave("")}>Clear amount</button>
    </div>
  </dialog>;
}

export function PrizeDollarField({ name, value, issueId, onActivate, onChange }: {
  name: "minValue" | "maxValue"; value: string; issueId?: string; onActivate: () => void; onChange: (value: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const isMinimum = name === "minValue";
  const title = isMinimum ? "Minimum prize value" : "Maximum prize value";
  const amount = Number(value);
  const usable = Number.isInteger(amount) && amount >= 0 && amount <= MAX_PRIZE_VALUE;
  function close() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  return <div className={styles.field}>
    <label id={`${id}-label`} htmlFor={id}>{isMinimum ? "From ($)" : "To ($)"}</label>
    <input id={id} type="number" name={name} min={0} max={MAX_PRIZE_VALUE} step={1} inputMode="numeric"
      value={value} aria-invalid={issueId ? true : undefined} aria-describedby={issueId}
      onFocus={event => { onActivate(); event.currentTarget.select(); }}
      onChange={event => onChange(event.currentTarget.value)} />
    <button ref={trigger} type="button" data-bound={name} aria-haspopup="dialog" aria-expanded={open}
      aria-labelledby={`${id}-label ${id}-value`} aria-describedby={issueId} onClick={() => setOpen(true)}>
      <span id={`${id}-value`}>{value && usable ? formatter.format(amount) : isMinimum ? "No minimum" : "No maximum"}</span>
      <span aria-hidden="true">⌄</span>
    </button>
    {open ? <DollarWheel label={title} initial={usable ? amount : 0} onCancel={close}
      onSave={next => { onActivate(); onChange(next); close(); }} /> : null}
  </div>;
}
