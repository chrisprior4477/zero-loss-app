"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { revealBelowHeader } from "@/lib/account/landing-position";
import { PrintSheetButton } from "./PrintSheetButton";
import { useDialogBack } from "@/components/account/useDialogBack";

const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
  K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww", O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn",
  U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn", "-": "nwnnnnwnw", "*": "nwnnwnwnn",
};

const printPreviewHash = "#print-entry-insert";
const missingPrintName = "LEGAL NAME NEEDED";
const missingPrintAccount = "VALID DEMO ACCOUNT NEEDED";

function shortReference(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `ZL-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0")}`;
}

export function Barcode({ value }: { value: string }) {
  const bars = `*${value}*`.split("").flatMap((character, characterIndex) => {
    const pattern = CODE39[character] ?? CODE39["-"];
    return [...pattern.split("").map((width, index) => ({ dark: index % 2 === 0, width: width === "w" ? 2.5 : 1, key: `${characterIndex}-${index}` })), { dark: false, width: 1, key: `${characterIndex}-gap` }];
  });
  return <div className="flex h-14 w-full max-w-[250px] items-stretch justify-center overflow-hidden bg-white px-2 py-1" role="img" aria-label={`Entry reference barcode ${value}`}>{bars.map((bar) => <span key={bar.key} className={bar.dark ? "bg-black" : "bg-white"} style={{ width: `${bar.width}px` }} />)}</div>;
}

type Props = { offeringTitle: string; offeringSlug: string; intro?: ReactNode; footer?: ReactNode; initialLegalName?: string; initialAccountReference?: string; signInHref?: string };
type PrintDraft = { offering: string; owner: string; name: string; account: string; revision: number };

export function FreeEntryPrintCard({ offeringTitle, offeringSlug, intro, footer, initialLegalName = "", initialAccountReference = "", signInHref }: Props) {
  const [name, setName] = useState(initialLegalName);
  const [accountReference, setAccountReference] = useState(initialAccountReference);
  const nameInput = useRef<HTMLInputElement>(null);
  const accountErrorId = useId();
  const [printEditsCleared, setPrintEditsCleared] = useState(false);
  const directReturn = useRef(false);
  const postcard = useRef<HTMLButtonElement>(null);
  const [addressSide, setAddressSide] = useState(true);
  const demoNoteTrigger = useRef<HTMLButtonElement>(null);
  const demoNoteId = useId();
  const [demoNoteVisible, setDemoNoteVisible] = useState(false);
  const printAfterNote = useRef(false);
  const [printPreview, setPrintPreview] = useState(false);
  const printTrigger = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const instructionScroll = useRef<number | null>(null);
  const previewOrigin = useRef<{ top: number; hash: string } | null>(null);
  const latestDraft = useRef<PrintDraft | null>(null);
  const cleanAccountReference = accountReference.trim().toUpperCase();
  const validAccountReference = /^DEMO-[0-9A-Z]{3,12}$/i.test(cleanAccountReference);
  const invalidAccountReference = Boolean(cleanAccountReference) && !validAccountReference;
  const reference = useMemo(() => shortReference(`${offeringSlug}-${cleanAccountReference}`), [cleanAccountReference, offeringSlug]);
  const flipLabel = addressSide ? "Show artwork side of postcard" : "Show address and entry details";

  const endDemoNoteHistory = useDialogBack(demoNoteVisible, () => {
    if (printAfterNote.current) {
      printAfterNote.current = false;
      setDemoNoteVisible(false);
      openPrintPreview();
    } else {
      dismissDemoNote();
    }
  }, false, true, false, "postcard-note", () => {
    setAddressSide(false);
    setDemoNoteVisible(true);
  });

  useEffect(() => {
    const restoreView = () => {
      const showingPrint = window.location.hash === printPreviewHash;
      const saved = window.history.state?.zeroLossPrintDraft;
      if (saved?.offering === offeringSlug && saved.owner === initialAccountReference && typeof saved.name === "string" && typeof saved.account === "string") {
        const revision = typeof saved.revision === "number" ? saved.revision : 0;
        if (!latestDraft.current || latestDraft.current.revision <= revision) latestDraft.current = { ...saved, revision };
      }
      const current = latestDraft.current;
      if (current?.offering === offeringSlug && current.owner === initialAccountReference) {
        setName(current.name.slice(0, 80));
        setAccountReference(initialAccountReference || current.account.slice(0, 80));
        if (showingPrint && (saved?.revision ?? -1) < current.revision) {
          window.history.replaceState({ ...window.history.state, zeroLossPrintDraft: { ...current, scroll: saved?.scroll } }, "");
        }
      } else {
        setName(initialLegalName);
        setAccountReference(initialAccountReference);
      }
      if (showingPrint && instructionScroll.current === null) {
        if (saved?.offering === offeringSlug && saved.owner === initialAccountReference && typeof saved.scroll === "number") {
          previewOrigin.current = { top: saved.scroll, hash: saved.fromHash === "" ? "" : "#free-entry-intro" };
        }
        instructionScroll.current = previewOrigin.current?.top ?? window.scrollY;
      }
      setPrintPreview(showingPrint);
    };
    const scrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const initial = requestAnimationFrame(restoreView);
    window.addEventListener("popstate", restoreView);
    return () => {
      window.history.scrollRestoration = scrollRestoration;
      cancelAnimationFrame(initial);
      window.removeEventListener("popstate", restoreView);
    };
  }, [offeringSlug, initialLegalName, initialAccountReference]);

  function updateDraft(nextName: string, nextAccount: string) {
    setPrintEditsCleared(false);
    setName(nextName);
    setAccountReference(nextAccount);
    latestDraft.current = {
      offering: offeringSlug, owner: initialAccountReference, name: nextName, account: nextAccount,
      revision: Math.max(Date.now(), (latestDraft.current?.revision ?? 0) + 1),
    };
    try {
      window.history.replaceState({ ...window.history.state, zeroLossPrintDraft: latestDraft.current }, "");
    } catch { /* The current tab still has the visible draft. */ }
  }

  function dismissDemoNote() {
    setDemoNoteVisible(false);
    demoNoteTrigger.current?.focus({ preventScroll: true });
  }

  function flipPostcard() {
    setDemoNoteVisible(false);
    setAddressSide(side => !side);
  }

  function openPrintPreview() {
    if (window.location.hash === printPreviewHash) return;
    instructionScroll.current = window.scrollY;
    previewOrigin.current = { top: window.scrollY, hash: window.location.hash };
    window.history.replaceState({ ...window.history.state, zeroLossPrintInstructions: window.location.href }, "");
    window.history.pushState({ ...window.history.state, zeroLossPrintPreview: true, zeroLossPrintDraft: {
      offering: offeringSlug, owner: initialAccountReference, name: name.slice(0, 80), account: accountReference.slice(0, 80),
      revision: latestDraft.current?.revision ?? 0, scroll: instructionScroll.current, fromHash: previewOrigin.current.hash,
    } }, "", printPreviewHash);
    setPrintPreview(true);
  }

  function closePrintPreview() {
    if (window.history.state?.zeroLossPrintPreview) {
      window.history.back();
      return;
    }
    directReturn.current = !previewOrigin.current;
    const { pathname, search } = window.location;
    const href = pathname + search + (previewOrigin.current?.hash ?? "#free-entry-intro");
    const state = { ...window.history.state };
    if (previewOrigin.current) state.zeroLossPrintInstructions = new URL(href, window.location.origin).href;
    window.history.replaceState(state, "", href);
    setPrintPreview(false);
  }

  useLayoutEffect(() => {
    if (instructionScroll.current === null) return;
    if (printPreview) {
      window.scrollTo({ top: 0, behavior: "instant" });
      backButton.current?.focus({ preventScroll: true });
    } else if (directReturn.current) {
      directReturn.current = false;
      instructionScroll.current = null;
      const heading = document.getElementById("free-entry-intro");
      heading?.focus({ preventScroll: true });
      if (heading) revealBelowHeader(heading);
    } else {
      window.scrollTo({ top: instructionScroll.current, behavior: "instant" });
      printTrigger.current?.focus({ preventScroll: true });
      instructionScroll.current = null;
    }
  }, [printPreview]);

  const printName = name.trim().slice(0, 80);
  const blankSample = !printName || !validAccountReference;
  const printAccount = validAccountReference ? cleanAccountReference : missingPrintAccount;
  if (printPreview) return <FreeEntryPrintSheet offering={offeringSlug} title={offeringTitle}
    name={printName || missingPrintName} account={printAccount}
    reference={reference} blankSample={blankSample} back={<button type="button" ref={backButton} onClick={closePrintPreview}
      className="inline-flex min-h-8 items-center text-sm font-bold text-cyan-300 hover:text-white sm:min-h-0">← Back to entry instructions</button>} />;

  return <div className="amo-free-entry-page min-h-screen bg-[#00132e] px-4 py-10 text-white sm:px-7">
    <div className="mx-auto max-w-4xl">
    {intro}
    <div className="print:hidden grid gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 sm:grid-cols-2">
      <label className="text-sm font-bold">Your full legal name<input ref={nameInput} value={name} maxLength={80} onChange={(event) => updateDraft(event.target.value, accountReference)} placeholder="Enter your legal name" className="mt-2 w-full rounded-xl border border-white/20 bg-[#00132e] px-3 py-2.5 font-normal text-white" /></label>
      <div><label className="block text-sm font-bold">Zero Loss account reference<input value={accountReference} aria-invalid={invalidAccountReference || undefined} aria-describedby={invalidAccountReference ? accountErrorId : undefined} maxLength={80} onChange={(event) => updateDraft(name, event.target.value)} readOnly={Boolean(initialAccountReference)} placeholder="Sign in to fill your reference" className="mt-2 w-full rounded-xl border border-white/20 bg-[#00132e] px-3 py-2.5 font-normal text-white" /></label>
        {invalidAccountReference ? <p id={accountErrorId} role="status" className="mt-2 text-sm text-amber-200">Enter a valid demo account reference, or sign in to fill it automatically.</p> : null}
        {signInHref ? <Link className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-cyan-300 underline" href={signInHref}>Sign in to fill your account reference</Link> : null}
        {(name !== initialLegalName || accountReference !== initialAccountReference) && <button type="button" className="mt-1 min-h-11 text-sm font-bold text-cyan-300 underline" onClick={() => {
          updateDraft(initialLegalName, initialAccountReference);
          setPrintEditsCleared(true);
          nameInput.current?.focus({ preventScroll: true });
          if (nameInput.current) revealBelowHeader(nameInput.current);
        }}>Clear print edits</button>}
        {printEditsCleared ? <p role="status" className="mt-2 text-sm">Print edits cleared.</p> : null}
      </div>
    </div>

    <div className="print:hidden mt-5 flex items-center justify-between gap-3 text-sm text-white/60"><span>Tap the postcard to see both sides.</span><button type="button" onClick={flipPostcard} className="rounded-full border border-cyan-300/30 px-3 py-1 font-bold text-cyan-300 transition hover:border-cyan-200 hover:bg-cyan-300/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" aria-label={flipLabel}>{addressSide ? "Show artwork" : "Show address and entry details"}</button></div>

    <div onKeyDown={event => {
      if (event.key !== "Escape" || !demoNoteVisible || addressSide) return;
      event.preventDefault();
      event.stopPropagation();
      dismissDemoNote();
    }} className="relative mx-auto mt-4 block aspect-[3/2] w-full max-w-[720px] text-left [container-type:inline-size] print:pointer-events-none print:mt-0 print:max-w-none">
      <div className="amo-postcard-artwork">
        <span className={`absolute inset-0 block transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:duration-0 ${addressSide ? "[transform:rotateY(180deg)]" : ""}`}>
          <span aria-hidden={addressSide} style={{ backgroundImage: "url('/catalog/zero-loss-marketplace-postcard-front-v1.png')" }} className="absolute inset-0 block overflow-hidden border border-white bg-cover bg-center text-white shadow-[0_28px_70px_rgba(0,0,0,.38)] [backface-visibility:hidden] print:shadow-none">
            <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,19,46,.78)_0%,rgba(0,19,46,.08)_48%,rgba(0,19,46,.2)_100%)]" />
            <span className="relative flex h-full flex-col justify-between p-5 sm:p-[38px]">
              <span><span className="block text-3xl font-black tracking-[-0.05em] drop-shadow-[0_3px_8px_rgba(0,0,0,.8)] sm:text-6xl">ZERØ <span className="text-[#31e800]">LØSS</span></span><span className="mt-1 block text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200 drop-shadow sm:text-sm">Real shots. Real wins.</span></span>
              <span className="max-w-[45%] text-[10px] font-bold leading-4 text-white drop-shadow-[0_2px_5px_rgba(0,0,0,.9)] sm:text-base sm:leading-6">Your free way into the next opportunity.</span>
            </span>
          </span>

          <span aria-hidden={!addressSide} className="absolute inset-0 block overflow-hidden border border-slate-300 bg-[#fffdf7] p-3 text-[#00132e] shadow-[0_28px_70px_rgba(0,0,0,.38)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-[30px]">
            <span className="flex h-full flex-col">
              <span className="flex items-start justify-between gap-2"><span><span className="block text-[8px] font-black uppercase tracking-[0.18em] text-[#067abb] sm:text-xs">Zero Loss AMOE</span><span className="block text-sm font-black sm:mt-1 sm:text-2xl">Mail-in entry request</span></span><span className={`grid aspect-[.82/1] w-10 place-items-center border-2 border-dashed border-[#ff630f] bg-[#fff3e7] text-center text-[6px] font-black leading-2 text-[#b43d00] shadow-md transition-all duration-700 sm:w-20 sm:text-[10px] sm:leading-3 ${addressSide ? "translate-y-0 rotate-[-2deg] opacity-100 delay-300" : "-translate-y-10 rotate-12 opacity-0"}`}>USA<br /><span className="text-xs sm:text-xl">65¢</span><br />POSTCARD</span></span>
              <span className="mt-2 grid min-h-0 flex-1 grid-cols-[1.18fr_.82fr] gap-2 sm:mt-3 sm:grid-cols-[.95fr_1.05fr] sm:gap-6">
                <span className="flex min-h-0 min-w-0 flex-col items-center justify-center border-2 border-dashed border-slate-400 p-1.5 text-center text-[9px] leading-3 text-slate-600 sm:p-3 sm:text-[11px] sm:leading-4">
                  <span className="flex w-full flex-wrap items-center justify-center gap-x-1 [overflow-wrap:anywhere]"><strong className="text-[#00132e]">Entrant:</strong><span>{name}</span><strong className="text-[#00132e]">Account:</strong><span>{cleanAccountReference}</span><strong className="text-[#00132e]">Offering:</strong><span>{offeringTitle}</span></span>
                  <span className="mt-1 flex min-h-0 w-full max-w-[250px] flex-col items-center rounded-lg border border-slate-300 bg-white p-0.5 sm:mt-2 sm:p-1"><Barcode value={reference} /><span className="block text-center font-mono text-[8px] font-bold">{reference}</span></span>
                  <span className="mt-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-slate-500 sm:mt-1">Cut along dotted line</span>
                </span>
                <span className="flex min-h-0 flex-col justify-center text-[9px] leading-3 sm:text-xs sm:leading-normal"><strong className="mb-1 text-[#00132e] sm:mb-2">Mail to:</strong><span className="border-b border-slate-400 py-0.5 sm:py-1.5">ZERO LOSS AMOE PROCESSING</span><span className="border-b border-slate-400 py-0.5 sm:py-1.5">ADDRESS PENDING COUNSEL APPROVAL</span><span className="border-b border-slate-400 py-0.5 sm:py-1.5">CITY, STATE ZIP</span><strong className="mt-1 text-[#b43d00] sm:mt-2">PROTOTYPE—DO NOT MAIL</strong></span>
              </span>
              <span className="mt-1 hidden border-t border-slate-300 pt-1 text-[8px] leading-3 text-slate-500 sm:mt-3 sm:block sm:pt-2 sm:text-[10px] sm:leading-4">Attach the printed entry insert securely and keep all barcodes, address lines, and postage uncovered. Mailing dates, receipt deadlines, and limits are controlled exclusively by the Official Rules.</span>
            </span>
          </span>
        </span>
        <button ref={postcard} type="button" aria-label={addressSide ? "Flip postcard to artwork" : "Flip postcard to the mailing side"} onClick={flipPostcard} className="absolute inset-0 z-10 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" />
        {!addressSide && <button ref={demoNoteTrigger} type="button" aria-expanded={demoNoteVisible} aria-controls={demoNoteVisible ? demoNoteId : undefined} onClick={(event) => { event.stopPropagation(); setDemoNoteVisible(true); }} className="absolute bottom-[5%] right-[3%] z-20 rotate-[-7deg] rounded-md bg-[#ff630f] px-4 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-black shadow-lg sm:px-6 sm:py-3 sm:text-xs">Postcard demonstration</button>}
        {demoNoteVisible && !addressSide && <span id={demoNoteId} role="status" className="absolute inset-x-[8%] bottom-[22%] z-30 rounded-xl border border-cyan-200/50 bg-[#00132e]/95 p-3 text-center text-[10px] font-bold leading-4 text-white shadow-xl sm:text-sm sm:leading-6">You may use any standard-size postcard that satisfies the Official Rules.<button type="button" onClick={(event) => { event.stopPropagation(); dismissDemoNote(); }} className="ml-2 text-cyan-300 underline">Dismiss</button></span>}
      </div>
    </div>

    <div className="print:hidden mt-5 grid gap-4 rounded-2xl border border-white/12 bg-white/5 p-4 sm:grid-cols-[auto_auto_1fr] sm:items-center"><button type="button" ref={printTrigger} onClick={() => {
      if (demoNoteVisible) {
        printAfterNote.current = true;
        endDemoNoteHistory();
      } else {
        openPrintPreview();
      }
    }} className="rounded-xl bg-[#00b9ff] px-5 py-3 font-extrabold text-[#00132e] hover:bg-cyan-200">Print entry insert</button><button type="button" onClick={() => {
      flipPostcard();
      requestAnimationFrame(() => {
        const card = postcard.current;
        if (!card) return;
        const header = Math.max(0, document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0);
        card.focus({ preventScroll: true });
        window.scrollTo({ top: Math.max(0, window.scrollY + card.getBoundingClientRect().top - header - 12), behavior: "instant" });
      });
    }} className="rounded-xl border border-white/20 px-5 py-3 font-bold text-white hover:bg-white/8">Flip postcard</button><p className="text-xs leading-5 text-white/60"><strong className="text-white">How to use it:</strong> Print on standard 8.5 × 11 paper, cut around the dotted line, and securely attach the insert to a standard postcard. Protect the paper from moisture where practical, but leave the Zero Loss barcode, mailing address, postal barcode area, and stamp uncovered. After an approved AMOE request is received and validated, Zero Loss will send a confirmation email.</p></div>

    <div className="amo-print-sheet" aria-hidden="true"><PrintableEntryInsert title={offeringTitle} name={printName || missingPrintName} account={printAccount} reference={reference} blankSample={blankSample} /></div>
    {footer}
    </div>
  </div>;
}

export function FreeEntryPrintSheet({ offering, title, name, account, reference, back, blankSample = false }: {
  offering: string; title: string; name: string; account: string; reference: string; back: ReactNode; blankSample?: boolean;
}) {
  return <div className="amo-print-document-page min-h-screen bg-slate-200 px-4 py-6 text-[#00132e]">
    <div id="print-entry-insert" className="amo-print-controls mx-auto mb-5 flex max-w-[8.5in] flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#001b3d] p-4 text-white shadow-lg">
      <div>
        {back}
        <h1 className="mt-2 text-xl font-black">Print entry insert</h1>
        {blankSample ? <p className="mt-2 text-sm font-bold text-amber-100">Blank sample. Return to entry instructions to fill in your name and account reference before printing a personalized insert.</p> : null}
        <p className="mt-1 text-xs text-white/65">The white page below represents one actual letter-size 8.5 × 11 sheet. If this preview blocks printing, open the PDF.</p>
      </div>
      <PrintSheetButton offering={offering} name={name} account={account} reference={reference} />
    </div>
    <PrintableEntryInsert title={title} name={name} account={account} reference={reference} blankSample={blankSample} />
  </div>;
}

function PrintableEntryInsert({ title, name, account, reference, blankSample }: { title: string; name: string; account: string; reference: string; blankSample: boolean }) {
  return <section className="amo-paper-preview" aria-label="Letter-size print preview">
    <article className="amo-postcard-cutout">
      <div className="amo-postcard-inner">
        <p className="text-center text-[8pt] font-black uppercase tracking-[0.18em] text-[#067abb]">Zero Loss AMOE entry insert</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-[8pt] leading-4 text-slate-700">
          <strong className="text-[#00132e]">Entrant:</strong><span>{name}</span><span aria-hidden="true">•</span>
          <strong className="text-[#00132e]">Account:</strong><span>{account}</span><span aria-hidden="true">•</span>
          <strong className="text-[#00132e]">Offering:</strong><span>{title}</span>
        </div>
        <div className="mt-2 flex flex-col items-center">
          <Barcode value={reference} />
          <span className="mt-0.5 font-mono text-[8pt] font-bold">{reference}</span>
        </div>
        <p className="mt-1 text-center text-[6.5pt] leading-3 text-slate-600">Attach securely to a standard postcard. Keep the barcode flat, uncovered, and readable.</p>
        <p className="mt-1 text-center text-[6.5pt] font-black uppercase tracking-[0.1em] text-[#b43d00]">{blankSample ? "Blank sample — do not mail" : "Prototype — do not mail"}</p>
      </div>
      <span className="amo-cut-label">Cut along dotted line</span>
    </article>
  </section>;
}
