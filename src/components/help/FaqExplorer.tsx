"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { faqCategories, faqItems, faqSearchWords, filterFaqs, type FaqCategory } from "@/lib/help/faq";
import { FaqAnswer } from "./FaqAnswer";
import styles from "./help-tickets.module.css";
import { revealBelowHeader } from "@/lib/account/landing-position";
import { faqReturnKey, readFaqReturn, type FaqReturn } from "@/lib/help/faq-return";

const productRequestReturnKey = "zero-loss-faq-product-request-return";
const productRequestAnchor = "#faq-request-product";

export function FaqExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory>("all");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const panel = useRef<HTMLElement>(null);
  const searching = faqSearchWords(query).length > 0;
  const fillerOnly = /[a-z0-9]/i.test(query) && !searching;
  const invalidSearch = Boolean(query.trim()) && !searching && !fillerOnly;
  const items = invalidSearch ? [] : filterFaqs(searching ? query : "", category);
  const otherTopicMatches = items.length === 0 && searching && category !== "all" && filterFaqs(query, "all").length > 0;
  function updateBookmark(changes: Partial<FaqReturn>) {
    window.history.replaceState({ ...window.history.state, [faqReturnKey]: {
      href: window.location.href, query, category, expanded, collapsed, scrollY: window.scrollY, answer: null, answerTop: 0, ...changes,
    } }, "");
  }
  function changeQuery(value: string) { updateBookmark({ query: value, collapsed: [] }); setCollapsed([]); setQuery(value); }
  function clearQuery() {
    changeQuery("");
    document.getElementById("faq-search")?.focus();
  }
  function changeCategory(value: FaqCategory) { updateBookmark({ category: value }); setCategory(value); }
  useLayoutEffect(() => {
    let first = 0, second = 0, interrupted = false;
    const timers: number[] = [];
    function cancel() { cancelAnimationFrame(first); cancelAnimationFrame(second); timers.splice(0).forEach(clearTimeout); }
    function interrupt() { interrupted = true; cancel(); }
    function restore() {
      let saved = readFaqReturn(window.history.state, window.location.href);
      if (!saved && window.location.hash === productRequestAnchor) {
        try {
          saved = readFaqReturn(JSON.parse(sessionStorage.getItem(productRequestReturnKey) ?? "null"), window.location.href);
          sessionStorage.removeItem(productRequestReturnKey);
          if (saved) window.history.replaceState({ ...window.history.state, [faqReturnKey]: saved }, "");
        } catch { /* The direct answer link works without a recorded search. */ }
      }
      const direct = faqItems.find(item => window.location.hash === `#faq-${item.id}`);
      const destination = saved ?? (direct ? {
        href: window.location.href, query: "", category: "all" as const, expanded: [direct.id], collapsed: [],
        scrollY: 0, answer: direct.id, answerTop: 0, answerLink: direct.id === "request-product" ? direct.action.href : undefined,
      } : null);
      if (!destination) return;
      setQuery(destination.query); setCategory(destination.category); setExpanded(destination.expanded);
      setCollapsed(destination.collapsed ?? []);
      cancel(); interrupted = false;
      let focused = false;
      const align = () => {
        if (interrupted) return;
        cancelAnimationFrame(first); cancelAnimationFrame(second);
        first = requestAnimationFrame(() => { second = requestAnimationFrame(() => {
          if (interrupted || window.location.href !== destination.href) return;
          const answer = Array.from(panel.current?.querySelectorAll<HTMLElement>("[data-faq-id]") ?? []).find(element => element.dataset.faqId === destination.answer);
          const header = Math.max(0, document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0);
          const top = answer ? window.scrollY + answer.getBoundingClientRect().top - Math.max(header + 12, destination.answerTop) : destination.scrollY;
          window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
          if (!focused && answer) {
            const link = destination.answerLink
              ? Array.from(answer.querySelectorAll<HTMLAnchorElement>("a[href]")).find(candidate => candidate.getAttribute("href") === destination.answerLink)
              : answer.querySelector("summary");
            if (link?.getClientRects().length) { link.focus({ preventScroll: true }); focused = true; }
          }
        }); });
      };
      align(); for (const delay of [150, 400, 900]) timers.push(window.setTimeout(align, delay));
    }
    restore(); window.addEventListener("popstate", restore); window.addEventListener("pageshow", restore); window.addEventListener("hashchange", restore);
    for (const name of ["pointerdown", "touchstart", "wheel", "keydown"]) window.addEventListener(name, interrupt, { passive: true });
    return () => {
      cancel(); window.removeEventListener("popstate", restore); window.removeEventListener("pageshow", restore); window.removeEventListener("hashchange", restore);
      for (const name of ["pointerdown", "touchstart", "wheel", "keydown"]) window.removeEventListener(name, interrupt);
    };
  }, []);
  return <section ref={panel} aria-label="Find an answer" onClickCapture={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(anchor instanceof HTMLAnchorElement) || anchor.target && anchor.target !== "_self") return;
    const answer = anchor.closest<HTMLElement>("[data-faq-id]");
    const saved: FaqReturn = { href: window.location.href, query, category, collapsed,
      expanded: Array.from(panel.current?.querySelectorAll<HTMLDetailsElement>("details[open][data-faq-id]") ?? []).map(element => element.dataset.faqId!),
      scrollY: window.scrollY, answer: answer?.dataset.faqId ?? null, answerTop: answer?.getBoundingClientRect().top ?? 0,
      answerLink: answer ? anchor.getAttribute("href") ?? undefined : undefined };
    window.history.replaceState({ ...window.history.state, [faqReturnKey]: saved }, "");
    if (saved.answer === "request-product" && anchor.pathname === "/contact/product-request") {
      try {
        sessionStorage.setItem(productRequestReturnKey, JSON.stringify({
          [faqReturnKey]: { ...saved, href: new URL("/faq" + productRequestAnchor, window.location.origin).href },
        }));
      } catch { /* Browser Back still has its own bookmark. */ }
    }
  }}>
    <div className={`${styles.ticket} ${styles.panel}`}>
      <label htmlFor="faq-search" className="block text-lg font-extrabold">What do you need help with?</label>
      <div className={styles.searchRow}><div className={`${styles.ticket} ${styles.field}`}><input id="faq-search" type="search" maxLength={200} value={query} onChange={event => changeQuery(event.target.value)} placeholder="Try ‘undo’, ‘gift card’, or ‘password’" aria-controls="faq-results" /></div>{query.length > 0 ? <button type="button" onClick={clearQuery} className={`${styles.ticket} ${styles.button}`}>Clear</button> : null}</div>
      <p className={`mt-2 text-xs leading-5 ${styles.muted}`}>Answers update as you type. No search button or extra page.</p>
    </div>
    <div aria-label="Question topics" className={styles.topics}>{faqCategories.map(([key, label]) => <button key={key} type="button" aria-controls="faq-results" aria-pressed={category === key} onClick={() => changeCategory(key)} className={`${styles.ticket} ${styles.button}`}>{label}</button>)}</div>
    <p role="status" className="mb-4 text-sm text-white/65">{fillerOnly ? "Enter a topic word, such as password or gift card. " : ""}{items.length} {items.length === 1 ? "answer" : "answers"}{searching ? " matching your search" : ""}</p>
    <div id="faq-results" className="space-y-3">{items.length ? items.map(item => <FaqAnswer key={JSON.stringify([item.id, searching ? query.trim() : null])} item={item} expanded={searching ? !collapsed.includes(item.id) : expanded.includes(item.id)} onToggle={open => {
      if (searching && open === collapsed.includes(item.id)) {
        const next = open ? collapsed.filter(id => id !== item.id) : [...collapsed, item.id];
        updateBookmark({ collapsed: next }); setCollapsed(next);
      } else if (!searching && open !== expanded.includes(item.id)) {
        const next = open ? expanded.includes(item.id) ? expanded : [...expanded, item.id] : expanded.filter(id => id !== item.id);
        // Ignore a native toggle caused by restoring the same controlled state.
        if (next !== expanded) { updateBookmark({ expanded: next }); setExpanded(next); }
      }
    }} />) : <div className={`${styles.ticket} ${styles.panel}`}><h2 className="text-xl font-extrabold break-words">{invalidSearch ? "Enter a word to search for answers." : otherTopicMatches ? "No matches in this topic." : query.trim() ? <>No answers found for &ldquo;{query.trim()}&rdquo;.</> : "No answers found in this topic."}</h2><p className={`mt-2 ${styles.muted}`}>{otherTopicMatches ? "Other topics have answers for this search." : "Try different words or contact Support."}</p><div className="mt-4 flex flex-wrap gap-3">{otherTopicMatches ? <button type="button" onClick={() => { changeCategory("all");
      const field = document.getElementById("faq-search");
      field?.focus({ preventScroll: true });
      requestAnimationFrame(() => { if (field && document.activeElement === field) revealBelowHeader(field); }); }} className={`${styles.ticket} ${styles.button} ${styles.primary}`}>Search all topics</button> : null}<button type="button" onClick={clearQuery} className={`${styles.ticket} ${styles.button}`}>Clear search</button><Link href="/contact#message" className={`${styles.ticket} ${styles.button}`}>Contact Support</Link></div></div>}</div>
  </section>;
}
