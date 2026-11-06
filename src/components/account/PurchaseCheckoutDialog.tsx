"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./purchase-checkout.module.css";
const wheelRowHeight = 40;

export function NumberWheel({ label, min, max, value, disabled, onChange }: { label: string; min: number; max: number; value: number; disabled: boolean; onChange: (value: number) => void }) {
  const wheel = useRef<HTMLDivElement>(null);
  const lastScrolledValue = useRef<number | null>(null);
  const name = useId();
  useLayoutEffect(() => {
    const element = wheel.current;
    if (!element) return;
    // Preserve touch momentum. Only recenter for taps, keyboard or changes from outside the wheel.
    if (disabled || lastScrolledValue.current !== value) element.scrollTop = (value - min) * wheelRowHeight;
    if (!disabled && element.contains(document.activeElement)) {
      element.querySelector<HTMLInputElement>("input:checked")?.focus({ preventScroll: true });
    }
    lastScrolledValue.current = null;
  }, [value, min, max, disabled]);
  return <div ref={wheel} className={styles.numberWheel} role="radiogroup" aria-label={label} aria-disabled={disabled}
    style={{ "--wheel-row-height": `${wheelRowHeight}px` } as CSSProperties}
    onScroll={event => {
      if (disabled) return;
      const centered = Math.round(event.currentTarget.scrollTop / wheelRowHeight) + min;
      const next = Math.max(min, Math.min(max, centered));
      if (next !== value) {
        lastScrolledValue.current = next;
        onChange(next);
      }
    }}>
    {Array.from({ length: max - min + 1 }, (_, index) => min + index).map(number => <label key={number}>
      <input type="radio" name={name} aria-label={label + " " + number} disabled={disabled} checked={value === number}
        onChange={() => { lastScrolledValue.current = null; onChange(number); }} /><span>{number}</span>
    </label>)}
  </div>;
}

export function PurchaseDialog({ title, children, onClose, compact = false, className = "", closeLabel = "Close purchase popup", closeDisabled = false }: { title: string; children: ReactNode; onClose: () => void; compact?: boolean; className?: string; closeLabel?: string; closeDisabled?: boolean }) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [top, setTop] = useState(130);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    close.current?.focus({ preventScroll: true });
    const header = document.querySelector("header.sticky");
    function position() { setTop(Math.max(12, (header?.getBoundingClientRect().height ?? 0) + 8)); }
    position();
    window.addEventListener("resize", position);
    window.visualViewport?.addEventListener("resize", position);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
    if (header) observer?.observe(header);
    function keys(event: KeyboardEvent) {
      if (event.defaultPrevented) return; // The card wheel owns Escape while open.
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]') ?? []).filter(control => control.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("keydown", keys);
      window.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("resize", position);
      observer?.disconnect();
      document.documentElement.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [onClose]);
  return createPortal(<div className={styles.backdrop} style={{ "--preview-top": top + "px" } as CSSProperties} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="purchase-preview-dialog-title" className={styles.ticket + " " + styles.dialog + (compact ? " " + styles.refined : "") + " " + className}>
      <button ref={close} type="button" className={styles.close} onClick={onClose} aria-label={closeLabel} disabled={closeDisabled}>×</button>
      <h2 id="purchase-preview-dialog-title">{title}</h2>{children}
    </div>
  </div>, document.body);
}
