"use client";

import { startTransition, useActionState, useEffect, useLayoutEffect, useRef, useState } from "react";
import { submitCatalogRequest, type CatalogRequestState } from "@/lib/catalog/request-actions";
import { catalogRequestDraftKey, readCatalogRequestDraft, writeCatalogRequestDraft, type CatalogRequestDraft } from "@/lib/catalog/request-draft";

const initialState: CatalogRequestState = { status: "idle" };

async function saveRequest(previous: CatalogRequestState, formData: FormData): Promise<CatalogRequestState> {
  try { return await submitCatalogRequest(previous, formData); }
  catch { return { status: "error", message: "We could not confirm your request. Your details are still here. Please try again." }; }
}

type Props = { initialProduct?: string; ownerId?: string; scope?: string };

export function CatalogRequestForm({ initialProduct = "", ownerId, scope }: Props) {
  const draftKey = catalogRequestDraftKey(ownerId, initialProduct, scope);
  return <CatalogRequestSession key={draftKey} initialProduct={initialProduct} draftKey={draftKey} />;
}

function CatalogRequestSession({ initialProduct, draftKey }: { initialProduct: string; draftKey: string }) {
  const initialDraft = (): CatalogRequestDraft => ({ requestedItem: initialProduct, email: "", notes: "" });
  const [draft, setDraft] = useState(initialDraft);
  const [showFeedback, setShowFeedback] = useState(false);
  const restored = useRef(false);
  const sending = useRef(false);
  const requestedItem = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.location.hash === "#requested-item") requestedItem.current?.focus({ preventScroll: true });
  }, []);
  const dirty = draft.requestedItem !== initialProduct || Boolean(draft.email || draft.notes);
  useLayoutEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = readCatalogRequestDraft(draftKey);
    if (saved) {
      // Restore after hydration without reading browser storage on the server.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(saved);
    }
  }, [draftKey]);
  function changeDraft(change: Partial<CatalogRequestDraft>) {
    const next = { ...draft, ...change };
    if (next.requestedItem.trim() !== draft.requestedItem.trim() || next.notes.trim() !== draft.notes.trim()
      || next.email.trim().toLowerCase() !== draft.email.trim().toLowerCase()) delete next.requestKey;
    setDraft(next);
    setShowFeedback(false);
    writeCatalogRequestDraft(draftKey, next.requestedItem !== initialProduct || next.email || next.notes ? next : null);
  }
  const [state, formAction, pending] = useActionState(async (previous: CatalogRequestState, data: FormData) => {
    try {
      const result = await saveRequest(previous, data);
      if (result.status === "succeeded" && readCatalogRequestDraft(draftKey)?.requestKey === data.get("requestKey")) {
        writeCatalogRequestDraft(draftKey, null);
      }
      return result;
    } finally {
      sending.current = false;
    }
  }, initialState);

  if (state.status === "succeeded") {
    return (
      <div role="status" className="rounded-2xl border border-[#31e800]/50 bg-[#31e800]/10 p-6">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-[#62ff3b]">Request received</p>
        <p className="mt-2 text-lg font-bold text-white">{state.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={event => {
      event.preventDefault();
      if (sending.current || pending) return;
      // Keep the draft after errors; only confirmed success replaces this form.
      const formData = new FormData(event.currentTarget);
      const requestKey = draft.requestKey ?? crypto.randomUUID();
      const submitted = { ...draft, requestKey };
      sending.current = true;
      setDraft(submitted);
      writeCatalogRequestDraft(draftKey, submitted);
      formData.set("requestKey", requestKey);
      setShowFeedback(true);
      startTransition(() => formAction(formData));
    }} className="space-y-5">
      <input type="hidden" name="sourceQuery" value={initialProduct} />
      <div>
        <label htmlFor="requested-item" className="text-sm font-bold text-white">What would you like to see?</label>
        <input
          id="requested-item"
          ref={requestedItem}
          name="requestedItem"
          type="text"
          required
          minLength={2}
          maxLength={160}
          value={draft.requestedItem}
          onChange={event => changeDraft({ requestedItem: event.target.value })}
          disabled={pending}
          placeholder="Example: Kayaks, concert tickets, or running shoes"
          className="mt-2 min-h-12 w-full scroll-mt-44 rounded-xl border border-cyan-300/35 bg-[#001b3d] px-4 py-3 text-white outline-none placeholder:text-white/38 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
        />
      </div>
      <div>
        <label htmlFor="request-email" className="text-sm font-bold text-white">Email</label>
        <input
          id="request-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          value={draft.email}
          onChange={event => changeDraft({ email: event.target.value })}
          disabled={pending}
          placeholder="you@example.com"
          className="mt-2 min-h-12 w-full rounded-xl border border-cyan-300/35 bg-[#001b3d] px-4 py-3 text-white outline-none placeholder:text-white/38 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
        />
      </div>
      <div>
        <label htmlFor="request-notes" className="text-sm font-bold text-white">Anything else we should know? <span className="font-normal text-white/45">Optional</span></label>
        <textarea
          id="request-notes"
          name="notes"
          maxLength={1000}
          rows={4}
          value={draft.notes}
          onChange={event => changeDraft({ notes: event.target.value })}
          disabled={pending}
          placeholder="A favorite brand, retailer, size, price range, or anything else that would help."
          className="mt-2 w-full resize-y rounded-xl border border-cyan-300/35 bg-[#001b3d] px-4 py-3 text-white outline-none placeholder:text-white/38 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
        />
      </div>
      {showFeedback && state.status === "error" ? <p role="alert" className="rounded-xl border border-orange-400/45 bg-orange-400/10 px-4 py-3 text-sm font-semibold text-orange-100">{state.message}</p> : null}
      <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#31e800] px-5 py-3 font-black text-[#00132e] transition hover:bg-[#62ff3b] disabled:cursor-wait disabled:opacity-60 sm:w-auto">
        {pending ? "Sending request…" : "Send product request →"}
      </button>
      {dirty ? <button type="button" disabled={pending} className="block min-h-11 text-sm font-bold text-cyan-200 underline disabled:opacity-50" onClick={() => {
        setDraft(initialDraft()); setShowFeedback(false); writeCatalogRequestDraft(draftKey, null);
        requestedItem.current?.focus();
      }}>Clear draft</button> : null}
    </form>
  );
}
