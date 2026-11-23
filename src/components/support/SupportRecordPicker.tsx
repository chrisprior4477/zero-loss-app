"use client";

import { useAccountLocale } from "@/components/account/TimeZoneProvider";
import { useDialogBack } from "@/components/account/useDialogBack";
import { restoreDialogTrigger } from "@/components/account/dialog-keyboard";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import help from "@/components/help/help-tickets.module.css";
import { formatOfferDeadline } from "@/lib/account/timezone";
import { loadSupportRecords } from "@/lib/support/record-actions";
import type { SupportRecord, SupportRecordKind, SupportRecordPage } from "@/lib/support/records";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./support-record-picker.module.css";

function RecordDetails({ record, timeZone }: { record: SupportRecord; timeZone: string }) {
  const locale = useAccountLocale();
  const prefix = record.kind === "order" ? "Order" : "Transaction";
  const amount = (record.kind === "transaction" && record.amount > 0 ? "+" : "") + formatUsdFromCents(record.amount);
  return <>
    <span className={styles.recordHeading}><strong>{record.title}</strong><strong>{amount}</strong></span>
    <span className={styles.recordMeta}>{record.detail} · {prefix} #{record.id.slice(-8).toUpperCase()}</span>
    <span className={styles.recordMeta}>{formatOfferDeadline(record.date, timeZone, locale)} · {record.status}</span>
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
  const results = useRef<HTMLDivElement>(null);
  const focusResults = useRef(false);
  const request = useRef(0);
  const attachedPage = useRef<{ id: string; kind: SupportRecordKind; page: number } | null>(null);
  const focusRecordId = useRef<string | null>(null);
  const restoreOnForward = useRef(false);
  const selectedLookup = useRef<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<SupportRecordKind>("order");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<SupportRecordPage | null>(null);

  useLayoutEffect(() => {
    if (!result || !focusResults.current) return;
    focusResults.current = false;
    const recordId = focusRecordId.current;
    if (document.activeElement === document.body || document.activeElement === dialog.current || recordId && document.activeElement === closeButton.current) {
      const buttons = results.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      const matching = Array.from(buttons ?? []).find(button => button.dataset.recordId === recordId);
      (matching ?? buttons?.[0])?.focus();
      if (document.activeElement === document.body || document.activeElement === dialog.current) results.current?.focus();
    }
  }, [result]);

  const cursors = useRef(new Map<string, Pick<SupportRecord, "id" | "date">>());
  async function load(nextKind: SupportRecordKind, nextPage: number, focusAfterLoad = false, selectedId?: string) {
    const id = ++request.current;
    focusResults.current = focusAfterLoad;
    selectedLookup.current = selectedId;
    focusRecordId.current = selectedId ?? null;
    setKind(nextKind);
    setPage(nextPage);
    setResult(null);
    const cursorKey = `${nextKind}:${nextPage}`;
    const cursor = selectedId ? undefined : cursors.current.get(cursorKey);
    const lookup = cursor ? loadSupportRecords(nextKind, nextPage, undefined, cursor)
      : selectedId ? loadSupportRecords(nextKind, nextPage, selectedId) : loadSupportRecords(nextKind, nextPage);
    const response = await lookup.catch(() => ({ error: "We couldn’t load these records. Try again." }));
    if (id === request.current && dialog.current?.open) {
      if ("records" in response && response.page !== undefined) setPage(response.page);
      setResult(response);
    }
  }

  function openPicker(restoreView = false) {
    if (!dialog.current || dialog.current.open) return;
    dialog.current.showModal();
    setOpen(true);
    closeButton.current?.focus({ preventScroll: true });
    if (restoreView) {
      void load(kind, page, true);
      return;
    }
    const previous = attachedPage.current;
    const same = record && previous?.id === record.id && previous.kind === record.kind;
    void load(record?.kind ?? kind, record ? same ? previous.page : 0 : page, Boolean(record), record?.id);
  }

  useDialogBack(open, () => {
    restoreOnForward.current = true;
    dialog.current?.close();
    // Native close events can arrive after the next history traversal.
    flushSync(() => setOpen(false));
  }, false, true, false, headingId, () => {
    if (!restoreOnForward.current) return;
    restoreOnForward.current = false;
    openPicker(true);
  });

  return <div className={styles.attachment}>
    {record ? <div className={styles.attached} aria-live="polite">
      <small>Attached to your request</small>
      <RecordDetails record={record} timeZone={timeZone} />
    </div> : null}
    <div className={styles.controls}>
      <button type="button" ref={trigger} className={styles.control} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} onClick={() => openPicker()}>
        {record ? "Change" : "Attach an order or transaction (optional)"}
      </button>
      {record ? <button type="button" className={styles.control} disabled={disabled} onClick={() => {
        onChange();
        trigger.current?.focus({ preventScroll: true });
      }}>Remove</button> : null}
    </div>
    <dialog ref={dialog} aria-labelledby={headingId} className={styles.dialog} onClose={event => {
      if (event.currentTarget.open) return;
      request.current++;
      setOpen(false);
      restoreDialogTrigger(trigger.current, true);
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
        {record?.kind === kind && result && "records" in result && !result.records.some(item => item.id === record.id) ? <div className={styles.attached}>
          <small>Current attachment</small><RecordDetails record={record} timeZone={timeZone} />
        </div> : null}
        <div ref={results} tabIndex={-1} role="group" aria-label="Matching records" className={styles.history} aria-busy={!result}>
          {!result ? <p role="status">Loading records…</p> : "error" in result ? <>
            <p role="alert">{result.error}</p>
            <button type="button" className={styles.control} onClick={() => void load(kind, page, true, selectedLookup.current)}>Try again</button>
          </> : result.records.length ? <ul className={styles.records}>
            {result.records.map(item => <li key={item.id}>
              <button type="button" className={styles.record} disabled={item.attachable === false} data-record-id={item.id} onClick={() => {
                attachedPage.current = { id: item.id, kind: item.kind, page };
                onChange(item);
                dialog.current?.close();
              }}><RecordDetails record={item} timeZone={timeZone} />{record?.id === item.id && record.kind === item.kind ? <span className={styles.recordMeta}>Currently attached</span> : null}{item.attachable === false ? <span className={styles.recordMeta}>{item.verifyAgain ? "Payment verification is temporarily unavailable." : "No verified payment was found for this order. You can send your request without attaching it."}</span> : null}</button>
            </li>)}
          </ul> : <p role="status">No {kind === "order" ? "orders" : "wallet transactions"} on this page.</p>}
        </div>
        {result && "records" in result && result.records.some(item => item.verifyAgain) ? <button type="button" className={styles.control} onClick={() => void load(kind, page, true, selectedLookup.current)}>Retry payment verification</button> : null}
        {result && "records" in result && result.incomplete ? <div><p role="status">Some orders could not be loaded.</p><button type="button" className={styles.control} onClick={() => void load(kind, page, true, selectedLookup.current)}>Retry order list</button></div> : null}
        {page > 0 || (result && "more" in result && result.more) ? <div className={styles.controls}>
          {page > 0 ? <button type="button" className={styles.control} disabled={!result} onClick={() => void load(kind, page - 1, true)}>Previous</button> : null}
          {result && "more" in result && result.more ? <button type="button" className={styles.control} onClick={() => {
            const last = result.records.at(-1);
            if (last) cursors.current.set(`${kind}:${page + 1}`, { id: last.id, date: last.date });
            void load(kind, page + 1, true);
          }}>Next</button> : null}
        </div> : null}
        <button type="button" className={styles.control} onClick={() => dialog.current?.close()}>Cancel</button>
      </div>
    </dialog>
  </div>;
}
