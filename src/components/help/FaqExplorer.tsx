"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { faqCategories, filterFaqs, type FaqCategory } from "@/lib/help/faq";
import { FaqAnswer } from "./FaqAnswer";
import styles from "./help-tickets.module.css";
import { faqReturnKey, readFaqReturn, type FaqReturn } from "@/lib/help/faq-return";

export function FaqExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory>("all");
  const [expanded, setExpanded] = useState<string[]>([]);
  const panel = useRef<HTMLElement>(null);
  const items = filterFaqs(query, category);
  const searching = /[a-z0-9]/i.test(query);
  function updateBookmark(changes: Partial<FaqReturn>) {
    const saved = readFaqReturn(window.history.state, window.location.href);
    if (!saved) return;
    window.history.replaceState({ ...window.history.state, [faqReturnKey]: {
      ...saved, query, category, expanded, scrollY: window.scrollY, answer: null, answerTop: 0, ...changes,
    } }, "");
  }
  function changeQuery(value: string) { updateBookmark({ query: value }); setQuery(value); }
  function reset() { updateBookmark({ query: "", category: "all", expanded: [] }); setQuery(""); setCategory("all"); setExpanded([]); }
  useLayoutEffect(() => {
    let first = 0, second = 0, interrupted = false;
    const timers: number[] = [];
    function cancel() { cancelAnimationFrame(first); cancelAnimationFrame(second); timers.splice(0).forEach(clearTimeout); }
    function interrupt() { interrupted = true; cancel(); }
    function restore() {
      const saved = readFaqReturn(window.history.state, window.location.href);
      if (!saved) return;
      setQuery(saved.query); setCategory(saved.category); setExpanded(saved.expanded);
      cancel(); interrupted = false;
      const align = () => {
        if (interrupted) return;
        cancelAnimationFrame(first); cancelAnimationFrame(second);
        first = requestAnimationFrame(() => { second = requestAnimationFrame(() => {
          if (interrupted || window.location.href !== saved.href) return;
          const answer = Array.from(panel.current?.querySelectorAll<HTMLElement>("[data-faq-id]") ?? []).find(element => element.dataset.faqId === saved.answer);
          const header = Math.max(0, document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0);
          const top = answer ? window.scrollY + answer.getBoundingClientRect().top - Math.max(header + 12, saved.answerTop) : saved.scrollY;
          window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
        }); });
      };
      align(); for (const delay of [150, 400, 900]) timers.push(window.setTimeout(align, delay));
    }
    restore(); window.addEventListener("popstate", restore); window.addEventListener("pageshow", restore);
    for (const name of ["pointerdown", "touchstart", "wheel", "keydown"]) window.addEventListener(name, interrupt, { passive: true });
    return () => {
      cancel(); window.removeEventListener("popstate", restore); window.removeEventListener("pageshow", restore);
      for (const name of ["pointerdown", "touchstart", "wheel", "keydown"]) window.removeEventListener(name, interrupt);
    };
  }, []);
  return <section ref={panel} aria-label="Find an answer" onClickCapture={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(anchor instanceof HTMLAnchorElement) || anchor.target && anchor.target !== "_self") return;
    const answer = anchor.closest<HTMLElement>("[data-faq-id]");
    const saved: FaqReturn = { href: window.location.href, query, category,
      expanded: Array.from(panel.current?.querySelectorAll<HTMLDetailsElement>("details[open][data-faq-id]") ?? []).map(element => element.dataset.faqId!),
      scrollY: window.scrollY, answer: answer?.dataset.faqId ?? null, answerTop: answer?.getBoundingClientRect().top ?? 0 };
    window.history.replaceState({ ...window.history.state, [faqReturnKey]: saved }, "");
  }}>
    <div className={`${styles.ticket} ${styles.panel}`}>
      <label htmlFor="faq-search" className="block text-lg font-extrabold">What do you need help with?</label>
      <div className={styles.searchRow}><div className={`${styles.ticket} ${styles.field}`}><input id="faq-search" type="search" maxLength={200} value={query} onChange={event => changeQuery(event.target.value)} placeholder="Try ‘undo’, ‘gift card’, or ‘password’" aria-controls="faq-results" /></div>{searching ? <button type="button" onClick={() => changeQuery("")} className={`${styles.ticket} ${styles.button}`}>Clear</button> : null}</div>
      <p className={`mt-2 text-xs leading-5 ${styles.muted}`}>Answers update as you type. No search button or extra page.</p>
    </div>
    <div aria-label="Question topics" className={styles.topics}>{faqCategories.map(([key, label]) => <button key={key} type="button" aria-controls="faq-results" aria-pressed={category === key} onClick={() => { updateBookmark({ category: key }); setCategory(key); }} className={`${styles.ticket} ${styles.button}`}>{label}</button>)}</div>
    <p role="status" className="mb-4 text-sm text-white/65">{items.length} {items.length === 1 ? "answer" : "answers"}{searching ? " matching your search" : ""}</p>
    <div id="faq-results" className="space-y-3">{items.length ? items.map(item => <FaqAnswer key={`${item.id}-${searching}`} item={item} expanded={searching || expanded.includes(item.id)} onToggle={open => {
      if (!searching && open !== expanded.includes(item.id)) {
        const next = open ? expanded.includes(item.id) ? expanded : [...expanded, item.id] : expanded.filter(id => id !== item.id);
        // Ignore a native toggle caused by restoring the same controlled state.
        if (next !== expanded) { updateBookmark({ expanded: next }); setExpanded(next); }
      }
    }} />) : <div className={`${styles.ticket} ${styles.panel}`}><h2 className="text-xl font-extrabold break-words">{query.trim() ? <>No answers found for &ldquo;{query.trim()}&rdquo;.</> : "No answers found in this topic."}</h2><p className={`mt-2 ${styles.muted}`}>Try different words or contact Support.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={reset} className={`${styles.ticket} ${styles.button}`}>Clear search</button><Link href="/contact#message" className={`${styles.ticket} ${styles.button}`}>Contact Support</Link></div></div>}</div>
  </section>;
}
