"use client";

import { startTransition, useActionState, useEffect, useLayoutEffect, useRef, useState } from "react";
import { checkCatalogRequestReceipt, submitCatalogRequest, type CatalogRequestState } from "@/lib/catalog/request-actions";
import { catalogRequestDraftKey, readCatalogRequestDraft, writeCatalogRequestDraft, type CatalogRequestDraft } from "@/lib/catalog/request-draft";
import { revealBelowHeader } from "@/lib/account/landing-position";

const initialState: CatalogRequestState = { status: "idle" };

async function saveRequest(previous: CatalogRequestState, formData: FormData): Promise<CatalogRequestState> {
  try { return await submitCatalogRequest(previous, formData); }
  catch { return { status: "error", uncertain: true, message: "We couldn’t confirm this request. Check the original submission." }; }
}

type Props = { initialProduct?: string; ownerId?: string; scope?: string };

export function CatalogRequestForm({ initialProduct = "", ownerId, scope }: Props) {
  const draftKey = catalogRequestDraftKey(ownerId, initialProduct, scope);
  const longQuery = initialProduct.length > 160;
  return <CatalogRequestSession key={draftKey} initialProduct={longQuery ? "" : initialProduct} originalQuery={longQuery ? initialProduct : ""} draftKey={draftKey} />;
}

function CatalogRequestSession({ initialProduct, originalQuery, draftKey }: { initialProduct: string; originalQuery: string; draftKey: string }) {
  const sourceQuery = originalQuery || initialProduct;
  const initialDraft = (): CatalogRequestDraft => ({ requestedItem: initialProduct, email: "", notes: "" });
  const [draft, setDraft] = useState(initialDraft);
  const [invalidItem, setInvalidItem] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [awaitingCheck, setAwaitingCheck] = useState(false);
  const restored = useRef(false);
  const focusRestoredCheck = useRef(false);
  const sending = useRef(false);
  const submitButton = useRef<HTMLButtonElement>(null);
  const restoreSubmitFocus = useRef(false);
  const requestedItem = useRef<HTMLInputElement>(null);
  const confirmation = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const field = requestedItem.current;
      if (!field || focusRestoredCheck.current || !["#requested-item", "#product-request"].includes(window.location.hash)) return;
      if (document.activeElement !== document.body && document.activeElement?.id !== "main-content") return;
      field.focus({ preventScroll: true });
      revealBelowHeader(field);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const dirty = draft.requestedItem !== initialProduct || Boolean(draft.email || draft.notes);
  useLayoutEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = readCatalogRequestDraft(draftKey);
    if (saved) {
      focusRestoredCheck.current = Boolean(saved.requestKey);
      // Restore after hydration without reading browser storage on the server.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(saved);
      setAwaitingCheck(Boolean(saved.requestKey));
    }
  }, [draftKey]);
  useEffect(() => {
    if (!awaitingCheck || !focusRestoredCheck.current) return;
    focusRestoredCheck.current = false;
    const button = submitButton.current;
    if (button && document.activeElement === document.body) {
      button.focus({ preventScroll: true });
      revealBelowHeader(button);
    }
  }, [awaitingCheck]);
  function changeDraft(change: Partial<CatalogRequestDraft>) {
    if (awaitingCheck || sending.current) return;
    const next = { ...draft, ...change };
    if (next.requestedItem.trim() !== draft.requestedItem.trim() || next.notes.trim() !== draft.notes.trim()
      || next.email.trim().toLowerCase() !== draft.email.trim().toLowerCase()) {
      delete next.requestKey;
      delete next.submittedSourceQuery;
    }
    setDraft(next);
    setShowFeedback(false);
    writeCatalogRequestDraft(draftKey, next.requestedItem !== initialProduct || next.email || next.notes ? next : null);
  }
  const [state, formAction, pending] = useActionState(async (previous: CatalogRequestState, data: FormData): Promise<CatalogRequestState> => {
    try {
      const result = data.get("intent") === "check" ? await checkCatalogRequestReceipt(data) : await saveRequest(previous, data);
      setAwaitingCheck(result.status === "error" && result.uncertain === true);
      if (result.status === "error" && !result.uncertain) {
        setDraft(current => ({ ...current, requestKey: undefined, submittedSourceQuery: undefined }));
        const saved = readCatalogRequestDraft(draftKey);
        if (saved?.requestKey === data.get("requestKey")) writeCatalogRequestDraft(draftKey, { ...saved, requestKey: undefined, submittedSourceQuery: undefined });
      }
      if (result.status === "succeeded" && readCatalogRequestDraft(draftKey)?.requestKey === data.get("requestKey")) {
        writeCatalogRequestDraft(draftKey, null);
      }
      return result;
    } catch {
      setAwaitingCheck(true);
      return { status: "error", uncertain: true, message: "We couldn’t check whether the request was saved. Check the original request again when your connection returns." };
    } finally {
      sending.current = false;
    }
  }, initialState);

  useEffect(() => {
    if (pending || !restoreSubmitFocus.current) return;
    restoreSubmitFocus.current = false;
    if (showFeedback && state.status === "succeeded") confirmation.current?.focus();
    if (showFeedback && state.status === "error" && document.activeElement === document.body) submitButton.current?.focus();
  }, [pending, showFeedback, state]);

  if (state.status === "succeeded" && showFeedback) {
    return (
      <div role="status" className="rounded-2xl border border-[#31e800]/50 bg-[#31e800]/10 p-6">
        <p ref={confirmation} tabIndex={-1} className="text-xs font-black uppercase tracking-[0.15em] text-[#62ff3b]">Request received</p>
        <p className="mt-2 text-lg font-bold text-white">{state.message}</p>
        <button type="button" className="mt-2 min-h-11 font-bold text-cyan-200 underline" onClick={() => {
          setDraft(initialDraft()); setShowFeedback(false);
          requestAnimationFrame(() => requestedItem.current?.focus());
        }}>Make another product request</button>
      </div>
    );
  }

  return (
    <form onSubmit={event => {
      event.preventDefault();
      if (sending.current || pending) return;
      if (!awaitingCheck && (requestedItem.current?.value.trim().length ?? 0) < 2) {
        setInvalidItem(true);
        requestedItem.current?.focus();
        return;
      }
      // Keep the draft after errors; only confirmed success replaces this form.
      const formData = new FormData(event.currentTarget);
      const requestKey = draft.requestKey ?? crypto.randomUUID();
      const submittedSourceQuery = draft.requestKey ? draft.submittedSourceQuery ?? sourceQuery.slice(0, 160) : sourceQuery;
      const submitted = { ...draft, requestKey, submittedSourceQuery };
      sending.current = true;
      restoreSubmitFocus.current = event.currentTarget.contains(document.activeElement);
      setDraft(submitted);
      writeCatalogRequestDraft(draftKey, submitted);
      formData.set("requestKey", requestKey);
      formData.set("sourceQuery", submittedSourceQuery);
      if (awaitingCheck) {
        formData.set("intent", "check");
        formData.set("requestedItem", draft.requestedItem);
        formData.set("email", draft.email);
        formData.set("notes", draft.notes);
      }
      setShowFeedback(true);
      startTransition(() => formAction(formData));
    }} className="space-y-5 [&_:invalid]:scroll-mt-[calc(var(--site-header-height,140px)+16px)]">
      <input type="hidden" name="sourceQuery" value={sourceQuery} />
      {originalQuery ? <div className="rounded-xl border border-cyan-300/35 p-4">
        <p className="text-sm font-bold text-white">Your original search</p>
        <p className="mt-1 break-words text-sm text-white/75">{originalQuery}</p>
      </div> : null}
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
          aria-invalid={invalidItem || undefined}
          aria-describedby={invalidItem ? "requested-item-error" : originalQuery ? "requested-item-limit" : undefined}
          value={draft.requestedItem}
          onChange={event => { setInvalidItem(false); changeDraft({ requestedItem: event.target.value }); }}
          readOnly={awaitingCheck}
          disabled={pending}
          placeholder="Example: Kayaks, concert tickets, or running shoes"
          className="mt-2 min-h-12 w-full scroll-mt-44 rounded-xl border border-cyan-300/35 bg-[#001b3d] px-4 py-3 text-white outline-none placeholder:text-white/38 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
        />
        {invalidItem ? <p id="requested-item-error" role="alert" className="mt-2 text-sm text-orange-100">Enter at least two characters for the product or retailer.</p> : null}
        {originalQuery ? <p id="requested-item-limit" className="mt-2 text-sm text-white/75">Use up to 160 characters for the title. You can add more detail in Notes.</p> : null}
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
          readOnly={awaitingCheck}
          disabled={pending}
          placeholder="you@example.com"
          className="mt-2 min-h-12 w-full rounded-xl border border-cyan-300/35 bg-[#001b3d] px-4 py-3 text-white outline-none placeholder:text-white/38 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
        />
      </div>
      <div>
        <label htmlFor="request-notes" className="text-sm font-bold text-white">Anything else we should know? <span className="font-normal text-white/65">Optional</span></label>
        <textarea
          id="request-notes"
          name="notes"
          maxLength={1000}
          rows={4}
          value={draft.notes}
          onChange={event => changeDraft({ notes: event.target.value })}
          readOnly={awaitingCheck}
          disabled={pending}
          placeholder="A favorite brand, retailer, size, price range, or anything else that would help."
          className="mt-2 w-full resize-y rounded-xl border border-cyan-300/35 bg-[#001b3d] px-4 py-3 text-white outline-none placeholder:text-white/38 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
        />
      </div>
      {awaitingCheck ? <p role="status">This submission still needs confirmation. Checking looks up the original request without sending it again.</p> : null}
      {showFeedback && state.status === "error" ? <p role="alert" className="rounded-xl border border-orange-400/45 bg-orange-400/10 px-4 py-3 text-sm font-semibold text-orange-100">{state.message}</p> : null}
      <button ref={submitButton} type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#31e800] px-5 py-3 font-black text-[#00132e] transition hover:bg-[#62ff3b] disabled:cursor-wait disabled:opacity-60 sm:w-auto">
        {pending ? awaitingCheck ? "Checking request…" : "Sending request…" : awaitingCheck ? "Check original request" : "Send product request →"}
      </button>
      {dirty && !awaitingCheck ? <button type="button" disabled={pending} className="block min-h-11 text-sm font-bold text-cyan-200 underline disabled:opacity-50" onClick={() => {
        setDraft(initialDraft()); setInvalidItem(false); setShowFeedback(false); writeCatalogRequestDraft(draftKey, null);
        requestedItem.current?.focus();
      }}>Clear draft</button> : null}
    </form>
  );
}
