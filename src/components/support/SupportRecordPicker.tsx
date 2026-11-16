"use client";

import { useId, useRef, useState } from "react";
import help from "@/components/help/help-tickets.module.css";
import { formatOfferDeadline } from "@/lib/account/timezone";
import { loadSupportRecords } from "@/lib/support/record-actions";
import type { SupportRecord, SupportRecordKind, SupportRecordPage } from "@/lib/support/records";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./support-record-picker.module.css";

function RecordDetails({ record, timeZone }: { record: SupportRecord; timeZone: string }) {
  const prefix = record.kind === "order" ? "Order" : "Transaction";
  const amount = (record.kind === "transaction" && record.amount > 0 ? "+" : "") + formatUsdFromCents(record.amount);
  return <>
    <span className={styles.recordHeading}><strong>{record.title}</strong><strong>{amount}</strong></span>
    <span className={styles.recordMeta}>{record.detail} · {prefix} #{record.id.slice(-8).toUpperCase()}</span>
    <span className={styles.recordMeta}>{formatOfferDeadline(record.date, timeZone)} · {record.status}</span>
  </>;
}

export function SupportRecordPicker({ record, onChange, timeZone, disabled }: {
  record?: SupportRecord;
  onChange: (record?: SupportRecord) => void;
  timeZone: string;
  disabled: boolean;
}) {
  const headingId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const request = useRef(0);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<SupportRecordKind>("order");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<SupportRecordPage | null>(null);

  async function load(nextKind: SupportRecordKind, nextPage: number) {
    const id = ++request.current;
    setKind(nextKind);
    setPage(nextPage);
    setResult(null);
    const response = await loadSupportRecords(nextKind, nextPage).catch(() => ({ error: "We couldn’t load these records. Try again." }));
    if (id === request.current) setResult(response);
  }

  function openPicker() {
    if (!dialog.current || dialog.current.open) return;
    dialog.current.showModal();
    setOpen(true);
    closeButton.current?.focus({ preventScroll: true });
    void load(record?.kind ?? "order", 0);
  }

  return <div className={styles.attachment}>
    {record ? <div className={styles.attached} aria-live="polite">
      <small>Attached to your request</small>
      <RecordDetails record={record} timeZone={timeZone} />
    </div> : null}
    <div className={styles.controls}>
      <button type="button" ref={trigger} className={styles.control} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} onClick={openPicker}>
        {record ? "Change" : "Attach an order or transaction (optional)"}
      </button>
      {record ? <button type="button" className={styles.control} disabled={disabled} onClick={() => {
        onChange();
        trigger.current?.focus({ preventScroll: true });
      }}>Remove</button> : null}
    </div>
    <dialog ref={dialog} aria-labelledby={headingId} className={styles.dialog} onClose={() => {
      request.current++;
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    }} onClick={event => {
      if (event.target === event.currentTarget) dialog.current?.close();
    }}>
      <div className={`${help.ticket} ${styles.sheet}`}>
        <div className={styles.heading}>
          <h2 id={headingId}>Choose a record</h2>
          <button type="button" className={styles.close} ref={closeButton} aria-label="Close record picker" onClick={() => dialog.current?.close()}>×</button>
        </div>
        <div className={styles.controls} role="group" aria-label="Record type">
          <button type="button" className={styles.control} aria-pressed={kind === "order"} onClick={() => { if (kind !== "order") void load("order", 0); }}>Orders</button>
          <button type="button" className={styles.control} aria-pressed={kind === "transaction"} onClick={() => { if (kind !== "transaction") void load("transaction", 0); }}>Wallet transactions</button>
        </div>
        <div className={styles.history} aria-busy={!result}>
          {!result ? <p role="status">Loading records…</p> : "error" in result ? <>
            <p role="alert">{result.error}</p>
            <button type="button" className={styles.control} onClick={() => void load(kind, page)}>Try again</button>
          </> : result.records.length ? <ul className={styles.records}>
            {result.records.map(item => <li key={item.id}>
              <button type="button" className={styles.record} onClick={() => {
                onChange(item);
                dialog.current?.close();
              }}><RecordDetails record={item} timeZone={timeZone} /></button>
            </li>)}
          </ul> : <p role="status">No {kind === "order" ? "orders" : "wallet transactions"} on this page.</p>}
        </div>
        {page > 0 || (result && "more" in result && result.more) ? <div className={styles.controls}>
          {page > 0 ? <button type="button" className={styles.control} onClick={() => void load(kind, page - 1)}>Previous</button> : null}
          {result && "more" in result && result.more ? <button type="button" className={styles.control} onClick={() => void load(kind, page + 1)}>Next</button> : null}
        </div> : null}
        <button type="button" className={styles.control} onClick={() => dialog.current?.close()}>Cancel</button>
      </div>
    </dialog>
  </div>;
}
