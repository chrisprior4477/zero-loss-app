"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

export function PrintSheetButton({ offering, name, account, reference }: {
  offering: string; name: string; account: string; reference: string;
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [pdfLink, setPdfLink] = useState("");
  const inFlight = useRef<{ controller: AbortController; popup: Window | null } | null>(null);
  const fallbackUrl = useRef("");
  const fallbackLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => () => {
    inFlight.current?.controller.abort();
    inFlight.current?.popup?.close();
    if (fallbackUrl.current) URL.revokeObjectURL(fallbackUrl.current);
  }, []);
  useEffect(() => {
    if (pdfLink) fallbackLink.current?.focus();
  }, [pdfLink]);

  async function openPdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const controller = new AbortController();
    const form = event.currentTarget;
    setOpening(true);
    setError("");
    setPdfLink("");
    if (fallbackUrl.current) URL.revokeObjectURL(fallbackUrl.current);
    fallbackUrl.current = "";
    // Open synchronously so browsers treat the new tab as a user gesture.
    let popup: Window | null = null;
    try { popup = window.open("", "_blank"); }
    catch { /* The prepared PDF can open through a link instead. */ }
    inFlight.current = { controller, popup };
    const deadline = window.setTimeout(() => controller.abort("print-deadline"), 20_000);
    try {
      if (popup) {
        popup.opener = null;
        popup.document.title = "Preparing your entry insert";
        popup.document.body.textContent = "Preparing your entry insert…";
      }
      const response = await fetch(form.action, { method: "POST", body: new FormData(form), signal: controller.signal });
      if (response.status === 422) {
        popup?.close();
        window.focus();
        setError("Use Open print dialog to print every character in your entry details.");
        return;
      }
      if (!response.ok || !response.headers.get("Content-Type")?.includes("application/pdf")) {
        throw new Error("PDF unavailable");
      }
      const blob = await response.blob();
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      if (popup && !popup.closed) {
        window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
        popup.location.replace(url);
      } else {
        fallbackUrl.current = url;
        setPdfLink(url);
      }
    } catch {
      if (controller.signal.aborted && controller.signal.reason !== "print-deadline") return;
      popup?.close();
      window.focus();
      setError("The printable PDF couldn’t open. Try again or use Open print dialog below.");
    } finally {
      window.clearTimeout(deadline);
      inFlight.current = null;
      if (!controller.signal.aborted || controller.signal.reason === "print-deadline") setOpening(false);
    }
  }

  return (
    <div>
      {error ? <p role="alert" className="mb-2 text-sm font-semibold text-amber-100">{error}</p> : null}
      {pdfLink ? <p role="status" className="mb-2 text-sm">Your PDF is ready to open.</p> : null}
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
        {pdfLink ? <a ref={fallbackLink} href={pdfLink} target="_blank" rel="noopener noreferrer" className="min-h-11 px-3 py-2 font-bold underline">Open prepared PDF</a> : null}
        <button type="button" onClick={() => window.print()} className="rounded-xl border border-white/25 px-5 py-3 font-bold text-white transition hover:bg-white/10">
          Open print dialog
        </button>
      </div>
    </div>
  );
}
