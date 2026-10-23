"use client";

import { useState } from "react";
import Link from "next/link";
import { faqCategories, filterFaqs, type FaqCategory } from "@/lib/help/faq";
import { FaqAnswer } from "./FaqAnswer";
import styles from "./help-tickets.module.css";

export function FaqExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory>("all");
  const items = filterFaqs(query, category);
  const searching = Boolean(query.trim());
  function reset() { setQuery(""); setCategory("all"); }
  return <section aria-label="Find an answer">
    <div className={`${styles.ticket} ${styles.panel}`}>
      <label htmlFor="faq-search" className="block text-lg font-extrabold">What do you need help with?</label>
      <div className={styles.searchRow}><div className={`${styles.ticket} ${styles.field}`}><input id="faq-search" type="search" maxLength={200} value={query} onChange={event => setQuery(event.target.value)} placeholder="Try ‘undo’, ‘gift card’, or ‘password’" aria-controls="faq-results" /></div>{searching ? <button type="button" onClick={() => setQuery("")} className={`${styles.ticket} ${styles.button}`}>Clear</button> : null}</div>
      <p className={`mt-2 text-xs leading-5 ${styles.muted}`}>Answers update as you type. No search button or extra page.</p>
    </div>
    <div aria-label="Question topics" className={styles.topics}>{faqCategories.map(([key, label]) => <button key={key} type="button" aria-controls="faq-results" aria-pressed={category === key} onClick={() => setCategory(key)} className={`${styles.ticket} ${styles.button}`}>{label}</button>)}</div>
    <p role="status" className="mb-4 text-sm text-white/65">{items.length} {items.length === 1 ? "answer" : "answers"}{searching ? " matching your search" : ""}</p>
    <div id="faq-results" className="space-y-3">{items.length ? items.map(item => <FaqAnswer key={`${item.id}-${searching}`} item={item} expanded={searching ? true : undefined} />) : <div className={`${styles.ticket} ${styles.panel}`}><h2 className="text-xl font-extrabold">Let’s find another way to help.</h2><p className={`mt-2 ${styles.muted}`}>Try a shorter phrase or another topic. You can also send us a message.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={reset} className={`${styles.ticket} ${styles.button}`}>Show all questions</button><Link href="/contact#message" className={`${styles.ticket} ${styles.button}`}>Contact support →</Link></div></div>}</div>
  </section>;
}
