"use client";

import { useMemo, useState } from "react";

const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
  K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww", O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn",
  U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn", "-": "nwnnnnwnw", "*": "nwnnwnwnn",
};

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
  return <div className="flex h-14 w-full max-w-[250px] items-stretch justify-center overflow-hidden bg-white px-2 py-1" aria-label={`Entry reference barcode ${value}`}>{bars.map((bar) => <span key={bar.key} className={bar.dark ? "bg-black" : "bg-white"} style={{ width: `${bar.width}px` }} />)}</div>;
}

type Props = { offeringTitle: string; offeringSlug: string };

export function FreeEntryPrintCard({ offeringTitle, offeringSlug }: Props) {
  const [name, setName] = useState("Chris P.");
  const [accountReference, setAccountReference] = useState("DEMO-ACCOUNT-001");
  const [addressSide, setAddressSide] = useState(false);
  const [demoNoteVisible, setDemoNoteVisible] = useState(false);
  const reference = useMemo(() => shortReference(`${offeringSlug}-${accountReference}`), [accountReference, offeringSlug]);

  const openPrintWindow = () => {
    const params = new URLSearchParams({
      offering: offeringSlug,
      name,
      account: accountReference,
      reference,
    });
    window.open(`/free-entry/print?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  return <>
    <div className="print:hidden grid gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 sm:grid-cols-2">
      <label className="text-sm font-bold">Your full legal name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-[#00132e] px-3 py-2.5 font-normal text-white" /></label>
      <label className="text-sm font-bold">Zero Loss account reference<input value={accountReference} onChange={(event) => setAccountReference(event.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-[#00132e] px-3 py-2.5 font-normal text-white" /></label>
    </div>

    <div className="print:hidden mt-5 flex items-center justify-between gap-3 text-sm text-white/60"><span>Tap the postcard to see both sides.</span><button type="button" onClick={() => setAddressSide((side) => !side)} className="rounded-full border border-cyan-300/30 px-3 py-1 font-bold text-cyan-300 transition hover:border-cyan-200 hover:bg-cyan-300/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" aria-label={`Show ${addressSide ? "entry" : "address"} side of postcard`}>{addressSide ? "Address side" : "Entry side"}</button></div>

    <div role="button" tabIndex={0} onClick={() => setAddressSide((side) => !side)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setAddressSide((side) => !side); } }} className="group relative mx-auto mt-4 block aspect-[3/2] w-full max-w-[720px] cursor-pointer text-left [perspective:1800px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 print:pointer-events-none print:mt-0 print:max-w-none" aria-label={`Show ${addressSide ? "entry" : "address"} side of postcard`}>
      <span className={`absolute inset-0 block transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:duration-0 ${addressSide ? "[transform:rotateY(180deg)]" : ""}`}>
        <span aria-hidden={addressSide} style={{ backgroundImage: "url('/catalog/zero-loss-marketplace-postcard-front-v1.png')" }} className="absolute inset-0 block overflow-hidden rounded-[22px] border-[6px] border-white bg-cover bg-center text-white shadow-[0_28px_70px_rgba(0,0,0,.38)] [backface-visibility:hidden] print:rounded-none print:shadow-none">
          <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,19,46,.78)_0%,rgba(0,19,46,.08)_48%,rgba(0,19,46,.2)_100%)]" />
          <span className="relative flex h-full flex-col justify-between p-[clamp(16px,4vw,38px)]">
            <span><span className="block text-3xl font-black tracking-[-0.05em] drop-shadow-[0_3px_8px_rgba(0,0,0,.8)] sm:text-6xl">ZERØ <span className="text-[#31e800]">LØSS</span></span><span className="mt-1 block text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200 drop-shadow sm:text-sm">Real shots. Real wins.</span></span>
            <span className="max-w-[45%] text-[10px] font-bold leading-4 text-white drop-shadow-[0_2px_5px_rgba(0,0,0,.9)] sm:text-base sm:leading-6">Your free way into the next opportunity.</span>
          </span>
        </span>

        <span aria-hidden={!addressSide} className="absolute inset-0 block overflow-hidden rounded-[22px] border-[6px] border-[#ff630f] bg-[#fffdf7] p-3 text-[#00132e] shadow-[0_28px_70px_rgba(0,0,0,.38)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-[clamp(14px,3.2vw,30px)]">
          <span className="flex h-full flex-col">
            <span className="flex items-start justify-between gap-2"><span><span className="block text-[8px] font-black uppercase tracking-[0.18em] text-[#067abb] sm:text-xs">Zero Loss AMOE</span><span className="block text-sm font-black sm:mt-1 sm:text-2xl">Mail-in entry request</span></span><span className={`grid aspect-[.82/1] w-10 place-items-center border-2 border-dashed border-[#ff630f] bg-[#fff3e7] text-center text-[6px] font-black leading-2 text-[#b43d00] shadow-md transition-all duration-700 sm:w-20 sm:text-[10px] sm:leading-3 ${addressSide ? "translate-y-0 rotate-[-2deg] opacity-100 delay-300" : "-translate-y-10 rotate-12 opacity-0"}`}>USA<br /><span className="text-xs sm:text-xl">65¢</span><br />POSTCARD</span></span>
            <span className="mt-2 grid min-h-0 flex-1 grid-cols-[1.18fr_.82fr] gap-2 sm:mt-3 sm:grid-cols-[.95fr_1.05fr] sm:gap-6">
              <span className="flex min-h-0 flex-col items-center justify-center overflow-hidden border-2 border-dashed border-slate-400 p-1.5 text-center text-[6px] leading-2.5 text-slate-600 sm:p-3 sm:text-[11px] sm:leading-4"><span className="flex max-w-full flex-wrap items-center justify-center gap-x-1"><strong className="text-[#00132e]">Entrant:</strong><span>{name}</span><strong className="text-[#00132e]">Account:</strong><span>{accountReference}</span><strong className="text-[#00132e]">Offering:</strong><span>{offeringTitle}</span></span><span className="mt-1 flex w-full max-w-[250px] flex-col items-center rounded-lg border border-slate-300 bg-white p-0.5 sm:mt-2 sm:p-1"><Barcode value={reference} /><span className="block text-center font-mono text-[6px] font-bold sm:text-[8px]">{reference}</span></span><span className="mt-0.5 text-center text-[6px] font-bold uppercase tracking-wider text-slate-500 sm:mt-1 sm:text-[7px]">Cut along dotted line</span></span>
              <span className="flex min-h-0 flex-col justify-center overflow-hidden text-[6px] leading-2.5 sm:text-xs sm:leading-normal"><strong className="mb-1 text-[#00132e] sm:mb-2">Mail to:</strong><span className="border-b border-slate-400 py-0.5 sm:py-1.5">ZERO LOSS AMOE PROCESSING</span><span className="border-b border-slate-400 py-0.5 sm:py-1.5">ADDRESS PENDING COUNSEL APPROVAL</span><span className="border-b border-slate-400 py-0.5 sm:py-1.5">CITY, STATE ZIP</span><strong className="mt-1 text-[#b43d00] sm:mt-2">PROTOTYPE—DO NOT MAIL</strong></span>
            </span>
            <span className="mt-1 hidden border-t border-slate-300 pt-1 text-[8px] leading-3 text-slate-500 sm:mt-3 sm:block sm:pt-2 sm:text-[10px] sm:leading-4">Attach the printed entry insert securely and keep all barcodes, address lines, and postage uncovered. Mailing dates, receipt deadlines, and limits are controlled exclusively by the Official Rules.</span>
          </span>
        </span>
      </span>
      {!addressSide && <button type="button" onClick={(event) => { event.stopPropagation(); setDemoNoteVisible(true); }} className="absolute bottom-[5%] right-[-1%] z-20 rotate-[-7deg] rounded-md bg-[#ff630f] px-4 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-black shadow-lg sm:px-6 sm:py-3 sm:text-xs">Postcard demonstration</button>}
      {demoNoteVisible && !addressSide && <span role="status" className="absolute inset-x-[8%] bottom-[22%] z-30 rounded-xl border border-cyan-200/50 bg-[#00132e]/95 p-3 text-center text-[10px] font-bold leading-4 text-white shadow-xl sm:text-sm sm:leading-6">You may use any standard-size postcard that satisfies the Official Rules.<button type="button" onClick={(event) => { event.stopPropagation(); setDemoNoteVisible(false); }} className="ml-2 text-cyan-300 underline">Dismiss</button></span>}
    </div>

    <div className="print:hidden mt-5 grid gap-4 rounded-2xl border border-white/12 bg-white/5 p-4 sm:grid-cols-[auto_auto_1fr] sm:items-center"><button type="button" onClick={openPrintWindow} className="rounded-xl bg-[#00b9ff] px-5 py-3 font-extrabold text-[#00132e] hover:bg-cyan-200">Print entry insert</button><button type="button" onClick={() => setAddressSide((side) => !side)} className="rounded-xl border border-white/20 px-5 py-3 font-bold text-white hover:bg-white/8">Flip postcard</button><p className="text-xs leading-5 text-white/60"><strong className="text-white">How to use it:</strong> Print on standard 8.5 × 11 paper, cut around the dotted line, and securely attach the insert to a standard postcard. Protect the paper from moisture where practical, but leave the Zero Loss barcode, mailing address, postal barcode area, and stamp uncovered. After an approved AMOE request is received and validated, Zero Loss will send a confirmation email.</p></div>

    <div className="amo-print-sheet" aria-hidden="true">
      <section className="amo-print-insert">
        <p className="text-center text-[10pt] font-black uppercase tracking-[0.18em] text-[#067abb]">Zero Loss AMOE entry insert</p>
        <h2 className="mt-1 text-center text-[17pt] font-black text-[#00132e]">Mail-in entry request</h2>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[10pt] leading-5 text-slate-700"><strong className="text-[#00132e]">Entrant:</strong><span>{name}</span><span aria-hidden="true">•</span><strong className="text-[#00132e]">Account:</strong><span>{accountReference}</span><span aria-hidden="true">•</span><strong className="text-[#00132e]">Offering:</strong><span>{offeringTitle}</span></div>
        <div className="mt-4 flex flex-col items-center"><Barcode value={reference} /><span className="mt-1 font-mono text-[9pt] font-bold text-[#00132e]">{reference}</span></div>
        <p className="mt-3 text-center text-[8pt] leading-4 text-slate-600">Attach this insert securely to a standard postcard. Keep the barcode flat, uncovered, and readable. Mailing eligibility, dates, limits, and the processing address are controlled by the Official Rules.</p>
        <p className="mt-2 text-center text-[8pt] font-black uppercase tracking-[0.12em] text-[#b43d00]">Prototype — do not mail</p>
      </section>
    </div>
  </>;
}
