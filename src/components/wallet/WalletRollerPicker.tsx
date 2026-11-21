"use client";

import { useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { restoreDialogTrigger, tabbableControls } from "@/components/account/dialog-keyboard";
import { useDialogBack } from "@/components/account/useDialogBack";
import styles from "./wallet-roller-picker.module.css";

type Choice = { value: string; label: string; detail?: string };
type PickerProps = {
  id?: string;
  label: string;
  placeholder: string;
  options: Choice[];
  value: string;
  disabled?: boolean;
  nestedHistory?: boolean;
  onChange: (value: string) => void;
};
const ROW_HEIGHT = 48;
const WHEEL_HEIGHT = ROW_HEIGHT * 3;

function RollerOverlay({ anchor, id, label, options, value, onChange, onClose }: {
  anchor: RefObject<HTMLButtonElement | null>;
  id: string;
  label: string;
  options: Choice[];
  value: string;
  onChange: (value: string) => void;
  onClose: (restoreFocus?: boolean, direction?: -1 | 1) => void;
}) {
  const popup = useRef<HTMLDivElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const [initialIndex] = useState(() => Math.max(0, options.findIndex(option => option.value === value)));
  const [offset, setOffset] = useState(initialIndex * ROW_HEIGHT);
  const [committing, setCommitting] = useState<string | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef(0);
  const browseIndex = useRef(initialIndex);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => { onCloseRef.current = onClose; });

  useLayoutEffect(() => {
    function position() {
      if (!anchor.current || !popup.current) return;
      const rect = anchor.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      const bottom = top + (viewport?.height ?? window.innerHeight);
      const above = bottom - rect.bottom < WHEEL_HEIGHT + 12 && rect.top > WHEEL_HEIGHT + 12;
      const desired = above ? rect.top - WHEEL_HEIGHT - 6 : rect.bottom + 4;
      Object.assign(popup.current.style, {
        top: `${Math.max(top + 4, Math.min(desired, bottom - WHEEL_HEIGHT - 4))}px`,
        left: `${rect.left}px`, width: `${rect.width}px`,
      });
    }
    position();
    if (wheel.current) {
      wheel.current.scrollTop = initialIndex * ROW_HEIGHT;
      wheel.current.focus({ preventScroll: true });
    }
    function outside(event: Event) {
      if (event.target instanceof Node && !popup.current?.contains(event.target) && !anchor.current?.contains(event.target)) onCloseRef.current();
    }
    function resized() {
      if (window.innerWidth >= 768) onCloseRef.current();
      else position();
    }
    function scrolled(event: Event) { if (event.target !== wheel.current) position(); }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    window.addEventListener("resize", resized);
    window.addEventListener("scroll", scrolled, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
    if (anchor.current) observer?.observe(anchor.current);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      window.removeEventListener("resize", resized);
      window.removeEventListener("scroll", scrolled, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
      observer?.disconnect();
      cancelAnimationFrame(frame.current);
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, [anchor, initialIndex]);

  function choose(option: Choice | undefined) {
    if (!option || !options.some(current => current.value === option.value) || commitTimer.current) return;
    setCommitting(option.value);
    onChange(option.value);
    // Green acknowledges a tap; scrolling never commits a choice.
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    commitTimer.current = setTimeout(() => onCloseRef.current(true), reducedMotion ? 0 : 180);
  }

  return createPortal(<div ref={popup} className={styles.overlay}>
    <div className={styles.centerBand} aria-hidden="true" />
    <div ref={wheel} id={`${id}-wheel`} role="radiogroup" aria-label={label} tabIndex={0}
      aria-activedescendant={`${id}-choice-${Math.round(offset / ROW_HEIGHT)}`} className={styles.wheel}
      onScroll={event => {
        const top = Math.max(0, Math.min((options.length - 1) * ROW_HEIGHT, event.currentTarget.scrollTop));
        browseIndex.current = Math.max(0, Math.min(options.length - 1, Math.round(top / ROW_HEIGHT)));
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => setOffset(top));
      }}
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); onClose(true); return; }
        if (event.key === "Tab") { event.preventDefault(); onClose(true, event.shiftKey ? -1 : 1); return; }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault(); choose(options[browseIndex.current]); return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || committing) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
          : Math.max(0, Math.min(options.length - 1, browseIndex.current + (event.key === "ArrowDown" ? 1 : -1)));
        browseIndex.current = next;
        setOffset(next * ROW_HEIGHT);
        wheel.current?.scrollTo({ top: next * ROW_HEIGHT, behavior: "instant" });
      }}>
      {options.map((option, index) => {
        const distance = Math.max(-2, Math.min(2, (index * ROW_HEIGHT - offset) / ROW_HEIGHT));
        return <button key={option.value} id={`${id}-choice-${index}`} type="button" role="radio"
          aria-checked={option.value === value} tabIndex={-1}
          className={`${styles.row} ${committing === option.value ? styles.confirmed : ""}`}
          onClick={() => choose(option)}>
          <span className={styles.rowContent} style={{ transform: `perspective(300px) rotateX(${-distance * 24}deg) scale(${1 - Math.abs(distance) * .08})`, opacity: 1 - Math.abs(distance) * .28 }}>
            <span className={styles.radio} aria-hidden="true"><span /></span>
            <span className={styles.choiceText}><strong>{option.label}</strong>{option.detail ? <small>{option.detail}</small> : null}</span>
          </span>
        </button>;
      })}
    </div>
    <div className={styles.rim} aria-hidden="true" />
  </div>, document.body);
}

export function WalletRollerPicker({ id: providedId, label, placeholder, options, value, disabled = false, nestedHistory = false, onChange }: PickerProps) {
  const uniqueId = useId();
  const id = providedId ?? uniqueId;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = options.find(option => option.value === value);
  const unavailable = disabled || options.length === 0;
  useDialogBack(open && !unavailable, () => close(true), false, true, nestedHistory);
  if (unavailable && open) setOpen(false);
  function close(restoreFocus = false, direction?: -1 | 1) {
    setOpen(false);
    if (restoreFocus) {
      const opener = trigger.current;
      if (!opener) return;
      const modal = opener.closest("dialog[open], [role=dialog][aria-modal=true]");
      const controls = direction ? tabbableControls(modal ?? document) : [];
      const index = controls.indexOf(opener);
      const adjacent = direction && index >= 0
        ? controls[index + direction] ?? (modal ? controls.at(direction === 1 ? 0 : -1) : undefined)
        : undefined;
      const destination = adjacent ?? opener;
      const href = window.location.href;
      const restore = () => {
        if (window.location.href === href && (document.activeElement === document.body || document.activeElement === destination)) {
          restoreDialogTrigger(destination, true);
        }
      };
      // A native history return can reset focus after the overlay has unmounted.
      const onReturn = () => requestAnimationFrame(restore);
      window.addEventListener("popstate", onReturn, { once: true });
      window.setTimeout(() => window.removeEventListener("popstate", onReturn), 650);
      if (direction) requestAnimationFrame(() => {
        if (window.location.href === href) restoreDialogTrigger(destination, true);
      });
      else restoreDialogTrigger(destination, true);
    }
  }
  return <div className={styles.picker}>
    <span id={`${id}-label`} className={styles.label}>{label}</span>
    <select id={id} aria-labelledby={`${id}-label`} className={styles.desktop} value={value} disabled={unavailable} onChange={event => onChange(event.target.value)}>
      <option value="" disabled>{placeholder}</option>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}{option.detail ? ` · ${option.detail}` : ""}</option>)}
    </select>
    <button ref={trigger} type="button" className={styles.trigger} disabled={unavailable}
      aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open && !unavailable} aria-controls={open ? `${id}-wheel` : undefined}
      onClick={() => setOpen(current => !current)}>
      <span id={`${id}-value`}>{selected ? <><strong>{selected.label}</strong>{selected.detail ? <small>{selected.detail}</small> : null}</> : placeholder}</span>
      <span className={styles.chevron} aria-hidden="true">{open ? "⌃" : "⌄"}</span>
    </button>
    {/* Refresh the wheel's position and pending animation only when the available choices change. */}
    {open && !unavailable ? <RollerOverlay key={JSON.stringify(options.map(option => option.value))} anchor={trigger} id={id} label={label} options={options} value={value} onChange={onChange} onClose={close} /> : null}
  </div>;
}
