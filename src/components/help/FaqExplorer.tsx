"use client";

import { useState } from "react";
import Link from "next/link";
import { faqCategories, filterFaqs, type FaqCategory } from "@/lib/help/faq";
import { FaqAnswer } from "./FaqAnswer";

export function FaqExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory>("all");
  const items = filterFaqs(query, category);
  const searching = Boolean(query.trim());
  function reset() { setQuery(""); setCategory("all"); }
  return <section aria-label="Find an answer">
    <div className="rounded-2xl border border-cyan-300/30 bg-[#082e52] p-5 sm:p-6">
      <label htmlFor="faq-search" className="block text-lg font-extrabold">What do you need help with?</label>
      <div className="mt-3 flex gap-2"><input id="faq-search" type="search" maxLength={200} value={query} onChange={event => setQuery(event.target.value)} placeholder="Try ‘undo’, ‘gift card’, or ‘password’" aria-controls="faq-results" className="min-h-12 min-w-0 flex-1 rounded-xl border border-cyan-300/40 bg-[#001b3d] px-4 text-base text-white placeholder:text-white/50 focus:outline-2 focus:outline-cyan-300" />{searching ? <button type="button" onClick={() => setQuery("")} className="rounded-xl border border-cyan-300/40 px-3 text-sm font-bold text-cyan-300">Clear</button> : null}</div>
      <p className="mt-2 text-xs leading-5 text-white/60">Answers update as you type. No search button or extra page.</p>
    </div>
    <div aria-label="Question topics" className="my-5 flex flex-wrap gap-2">{faqCategories.map(([key, label]) => <button key={key} type="button" aria-pressed={category === key} onClick={() => setCategory(key)} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${category === key ? "border-cyan-300 bg-[#00b9ff] text-[#00132e]" : "border-cyan-300/30 bg-[#052344] text-cyan-100 hover:border-cyan-300"}`}>{label}</button>)}</div>
    <p role="status" className="mb-4 text-sm text-white/65">{items.length} {items.length === 1 ? "answer" : "answers"}{searching ? " matching your search" : ""}</p>
    <div id="faq-results" className="space-y-3">{items.length ? items.map(item => <FaqAnswer key={`${item.id}-${searching}`} item={item} expanded={searching ? true : undefined} />) : <div className="rounded-2xl border border-cyan-300/30 bg-[#052344] p-6"><h2 className="text-xl font-extrabold">Let’s find another way to help.</h2><p className="mt-2 text-white/70">Try a shorter phrase or another topic. You can also send us a message.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={reset} className="min-h-11 rounded-xl bg-[#00b9ff] px-4 font-bold text-[#00132e]">Show all questions</button><Link href="/contact#message" className="inline-flex min-h-11 items-center rounded-xl border border-cyan-300/50 px-4 font-bold text-cyan-300">Contact support →</Link></div></div>}</div>
  </section>;
}
