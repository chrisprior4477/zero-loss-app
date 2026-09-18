"use client";

import { useActionState } from "react";
import { submitCatalogRequest, type CatalogRequestState } from "@/lib/catalog/request-actions";

const initialState: CatalogRequestState = { status: "idle" };

export function CatalogRequestForm({ initialProduct = "" }: { initialProduct?: string }) {
  const [state, formAction, pending] = useActionState(submitCatalogRequest, initialState);

  if (state.status === "succeeded") {
    return (
      <div role="status" className="rounded-2xl border border-[#31e800]/50 bg-[#31e800]/10 p-6">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-[#62ff3b]">Request received</p>
        <p className="mt-2 text-lg font-bold text-white">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="sourceQuery" value={initialProduct} />
      <div>
        <label htmlFor="requested-item" className="text-sm font-bold text-white">What would you like to see?</label>
        <input
          id="requested-item"
          name="requestedItem"
          type="text"
          required
          minLength={2}
          maxLength={160}
          defaultValue={initialProduct}
          placeholder="Example: Kayaks, concert tickets, or running shoes"
          className="mt-2 min-h-12 w-full rounded-xl border border-cyan-300/35 bg-[#001b3d] px-4 py-3 text-white outline-none placeholder:text-white/38 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
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
          placeholder="A favorite brand, retailer, size, price range, or anything else that would help."
          className="mt-2 w-full resize-y rounded-xl border border-cyan-300/35 bg-[#001b3d] px-4 py-3 text-white outline-none placeholder:text-white/38 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
        />
      </div>
      {state.status === "error" ? <p role="alert" className="rounded-xl border border-orange-400/45 bg-orange-400/10 px-4 py-3 text-sm font-semibold text-orange-100">{state.message}</p> : null}
      <button type="submit" disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#31e800] px-5 py-3 font-black text-[#00132e] transition hover:bg-[#62ff3b] disabled:cursor-wait disabled:opacity-60 sm:w-auto">
        {pending ? "Sending request…" : "Send product request →"}
      </button>
    </form>
  );
}
