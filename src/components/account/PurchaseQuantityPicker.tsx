"use client";

import { useEffect, useId, useRef } from "react";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./purchase-options.module.css";

export function PurchaseQuantityPicker({ quantity, count, totalCents, declineRest, disabled, onQuantity, onDeclineRest, onContinue }: {
  quantity: number; count: number; totalCents: number; declineRest: boolean; disabled: boolean;
  onQuantity: (quantity: number) => void; onDeclineRest: (decline: boolean) => void; onContinue: () => void;
}) {
  const id = useId();
  const wheel = useRef<HTMLDivElement>(null);
  const lastWheelQuantity = useRef<number | null>(null);
  const rest = count - quantity;
  const values = Array.from({ length: count }, (_, index) => index + 1);
  useEffect(() => {
    if (wheel.current && lastWheelQuantity.current !== quantity) wheel.current.scrollTop = (quantity - 1) * 44;
    lastWheelQuantity.current = quantity;
  }, [quantity, count]);
  useEffect(() => {
    const mobile = window.matchMedia?.("(max-width: 600px)");
    const position = () => { if (wheel.current && mobile?.matches) wheel.current.scrollTop = (quantity - 1) * 44; };
    mobile?.addEventListener("change", position);
    return () => mobile?.removeEventListener("change", position);
  }, [quantity]);

  function choose(value: number) {
    const next = Math.max(1, Math.min(count, value));
    lastWheelQuantity.current = null;
    if (wheel.current) wheel.current.scrollTop = (next - 1) * 44;
    onQuantity(next);
  }

  return <fieldset className={styles.quantityPicker} disabled={disabled}>
    <legend id={`${id}-label`}>How many would you like?</legend>
    <div className={styles.quantityRow}>
      <div className={styles.mobileWheel}>
        <div className={styles.wheelShell}>
          <div ref={wheel} className={styles.numberWheel} role="listbox" aria-labelledby={`${id}-label`}
            aria-activedescendant={`${id}-option-${quantity}`} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}
            onScroll={event => {
              if (disabled || !event.currentTarget.clientHeight) return;
              const next = Math.max(1, Math.min(count, Math.round(event.currentTarget.scrollTop / 44) + 1));
              lastWheelQuantity.current = next;
              if (next !== quantity) onQuantity(next);
            }}
            onKeyDown={event => {
              if (disabled || !["ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) return;
              event.preventDefault();
              choose(event.key === "Home" ? 1 : event.key === "End" ? count : quantity + ({ ArrowUp: -1, ArrowDown: 1, PageUp: -3, PageDown: 3 }[event.key] ?? 0));
            }}>
            {values.map(value => <button key={value} id={`${id}-option-${value}`} type="button" role="option" aria-selected={value === quantity}
              tabIndex={-1} className={styles.wheelNumber} onClick={() => choose(value)}>{value}</button>)}
          </div>
        </div>
        <span className={styles.wheelHint}>Swipe or scroll</span>
      </div>
      <select className={styles.desktopQuantity} aria-labelledby={`${id}-label`} value={quantity} onChange={event => onQuantity(Number(event.target.value))}>
        {values.map(value => <option key={value} value={value}>{value}</option>)}
      </select>
      <div className={styles.quantityAction}>
        <button type="button" className={styles.makePurchases} onClick={onContinue} aria-label={`Make ${quantity} purchase${quantity === 1 ? "" : "s"}${declineRest && rest ? `, decline ${rest}` : ""}`}>
          <span>Make <b className={styles.quantityBadge} style={{ width: Math.max(30, String(quantity).length * 9 + 12), height: Math.max(30, String(quantity).length * 9 + 12) }}>{quantity}</b> {quantity === 1 ? "purchase" : "purchases"}{declineRest && rest ? "," : ""}</span>
          {declineRest && rest ? <span>decline <b className={styles.quantityBadge} style={{ width: Math.max(30, String(rest).length * 9 + 12), height: Math.max(30, String(rest).length * 9 + 12) }}>{rest}</b></span> : null}
        </button>
        <p className={styles.quantityTotal}>{formatUsdFromCents(totalCents)} total</p>
      </div>
    </div>
    <label className={styles.declineRest}><input type="checkbox" checked={declineRest} disabled={disabled || rest === 0} onChange={event => onDeclineRest(event.target.checked)} />
      <span>Decline the other {rest} after purchase</span>
    </label>
  </fieldset>;
}
