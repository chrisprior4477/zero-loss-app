"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

export function PrintSheetButton({ offering, name, account, reference }: {
  offering: string; name: string; account: string; reference: string;
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [pdfLink, setPdfLink] = useState("");
  const openingRef = useRef(false);
  const fallbackUrl = useRef("");
  useEffect(() => () => {
    if (fallbackUrl.current) URL.revokeObjectURL(fallbackUrl.current);
  }, []);

  async function openPdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (openingRef.current) return;
    openingRef.current = true;
    const form = event.currentTarget;
    setOpening(true);
    setError("");
    setPdfLink("");
    if (fallbackUrl.current) URL.revokeObjectURL(fallbackUrl.current);
    fallbackUrl.current = "";
    // Open synchronously so browsers treat the new tab as a user gesture.
    const popup = window.open("", "_blank");
    if (popup) {
      popup.opener = null;
      popup.document.title = "Preparing your entry insert";
      popup.document.body.textContent = "Preparing your entry insert…";
    }
    try {
      const response = await fetch(form.action, { method: "POST", body: new FormData(form) });
      if (!response.ok || !response.headers.get("Content-Type")?.includes("application/pdf")) {
        throw new Error("PDF unavailable");
      }
      const url = URL.createObjectURL(await response.blob());
      if (popup && !popup.closed) {
        window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
        popup.location.replace(url);
      } else {
        fallbackUrl.current = url;
        setPdfLink(url);
      }
    } catch {
      popup?.close();
      window.focus();
      setError("The printable PDF couldn’t open. Try again or use Open print dialog below.");
    } finally {
      setOpening(false);
      openingRef.current = false;
    }
  }

  return (
    <div>
      {error ? <p role="alert" className="mb-2 text-sm font-semibold text-amber-100">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <form action="/api/free-entry-pdf" method="post" target="_blank" rel="noopener noreferrer" onSubmit={openPdf}>
          <input type="hidden" name="offering" value={offering} />
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="account" value={account} />
          <input type="hidden" name="reference" value={reference} />
          <button type="submit" aria-disabled={opening} className="rounded-xl bg-[#00b9ff] px-6 py-3 font-extrabold text-[#00132e] shadow-lg transition hover:bg-cyan-200 aria-disabled:opacity-60">
            {opening ? "Preparing PDF…" : "Open printable PDF"}
          </button>
        </form>
        {pdfLink ? <a href={pdfLink} target="_blank" rel="noopener noreferrer" className="min-h-11 px-3 py-2 font-bold underline">Open prepared PDF</a> : null}
        <button type="button" onClick={() => window.print()} className="rounded-xl border border-white/25 px-5 py-3 font-bold text-white transition hover:bg-white/10">
          Open print dialog
        </button>
      </div>
    </div>
  );
}
