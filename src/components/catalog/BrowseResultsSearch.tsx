"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { VoiceSearchControl } from "@/components/home/VoiceSearchButton";
import { useVoiceSearch } from "@/components/search/useVoiceSearch";
import { catalogSearchTooLong, catalogSearchLimitMessage, invalidCatalogSearch, invalidCatalogSearchMessage, maxCatalogSearchLength } from "@/lib/catalog/search-text";
import { scrollToCurrentSearch } from "@/lib/navigation/search-examples";
import { requestBrowseResultsFocus } from "./SearchResultsAutoScroll";
import styles from "./browse-discovery.module.css";

type Position = "top" | "bottom";
type Editor = Position | "filters";
type SearchSession = {
  browseHref: string;
  draft: string; setDraft: (value: string) => void; applied: string;
  editor: Editor | null; setEditor: (value: Editor | null) => void;
  search: (value: string, anchor?: string, restoreTop?: boolean, sourceInput?: string) => void; pending: boolean; voice: ReturnType<typeof useVoiceSearch>; endingSoon: boolean;
};
const Session = createContext<SearchSession | null>(null);
const searchDraftKey = "zeroLossBrowseSearchDraft";
let returnedDraft: { href: string; value: string; expires: number } | null = null;
export function useBrowseResultsSearch() { return useContext(Session); }

export function returnBrowseSearchDraft(href: string, value: string) {
  returnedDraft = { href, value, expires: Date.now() + 10000 };
}

export function BrowseSearchScope({ href }: { href: string }) {
  const params = new URL(href, "https://zeroloss.local").searchParams;
  params.delete("q");
  params.delete("batch");
  return Array.from(params, ([name, value]) => <input key={name} type="hidden" name={name} value={value} />);
}

export function BrowseResultsSearchSession({ browseHref, searchTerm, endingSoon = false, children }: {
  browseHref: string; searchTerm: string; endingSoon?: boolean; children: ReactNode;
}) {
  const router = useRouter();
  const [draft, updateDraft] = useState(searchTerm);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [lastApplied, setLastApplied] = useState(searchTerm);
  const [pendingTerm, setPendingTerm] = useState<string | null>(null);
  if (lastApplied !== searchTerm) {
    setLastApplied(searchTerm);
    if (pendingTerm === null || draft === pendingTerm || draft === lastApplied) updateDraft(searchTerm);
    setPendingTerm(null);
  }
  const setDraft = useCallback((value: string) => {
    updateDraft(value);
    const page = location.pathname + location.search;
    const state = { ...window.history.state };
    if (value === searchTerm) {
      if (!state[searchDraftKey]) return;
      delete state[searchDraftKey];
    } else {
      if (state[searchDraftKey]?.page === page && state[searchDraftKey]?.value === value) return;
      state[searchDraftKey] = { page, value };
    }
    try { window.history.replaceState(state, ""); } catch { /* The current search remains editable. */ }
  }, [searchTerm]);
  useLayoutEffect(() => {
    let currentPage = location.pathname + location.search;
    const savedDraft = () => {
      const saved = window.history.state?.[searchDraftKey];
      return saved?.page === currentPage && typeof saved.value === "string" && saved.value.length <= maxCatalogSearchLength
        ? saved.value as string : null;
    };
    const frame = requestAnimationFrame(() => {
      if (returnedDraft) {
        const target = new URL(returnedDraft.href, location.origin);
        const current = new URL(location.href);
        target.searchParams.sort();
        current.searchParams.sort();
        if (returnedDraft.expires < Date.now()) returnedDraft = null;
        else if (target.pathname === current.pathname && target.search === current.search) {
          const value = returnedDraft.value;
          returnedDraft = null;
          setDraft(value);
          return;
        }
      }
      const saved = savedDraft();
      if (saved !== null) updateDraft(current => current === searchTerm ? saved : current);
    });
    const restore = () => {
      const nextPage = location.pathname + location.search;
      if (currentPage === nextPage || location.pathname !== "/browse") return;
      cancelAnimationFrame(frame);
      currentPage = nextPage;
      setPendingTerm(null);
      updateDraft(savedDraft() ?? new URLSearchParams(location.search).get("q") ?? "");
    };
    window.addEventListener("popstate", restore);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", restore);
    };
  }, [browseHref, searchTerm, setDraft]);
  const voice = useVoiceSearch(setDraft);
  function search(value: string, anchor = "search-results", restoreTop = false, sourceInput?: string) {
    const term = value.trim();
    if (catalogSearchTooLong(term) || invalidCatalogSearch(term)) return;
    voice.cancel();
    setDraft(searchTerm);
    updateDraft(term);

    const url = new URL(browseHref, "https://zeroloss.local");
    if (term) url.searchParams.set("q", term); else url.searchParams.delete("q");
    // A new search starts at the first batch, retaining the shopper's filters.
    url.searchParams.delete("batch");
    const destination = `${url.pathname}${url.search}#${anchor}`;
    if (restoreTop || term) requestBrowseResultsFocus(destination, restoreTop ? "top-search" : "heading");
    if ((pendingTerm !== null && term !== pendingTerm) || !scrollToCurrentSearch(destination)) {
      if (sourceInput) {
        window.history.replaceState({
          ...window.history.state,
          zeroLossBrowseSearchReturn: { href: location.href, input: sourceInput, top: window.scrollY },
        }, "");
      }
      setPendingTerm(term === searchTerm ? null : term);
      router.push(destination, { scroll: false });
    }
  }
  return <Session.Provider value={{ browseHref, draft, setDraft, applied: searchTerm, editor, setEditor, search, pending: pendingTerm !== null, voice, endingSoon }}>{children}</Session.Provider>;
}

export function BrowseResultsSearch({ position, retailerScope }: { position: Position; retailerScope?: string }) {
  const session = useContext(Session);
  const id = useId();
  const field = useRef<HTMLInputElement>(null);
  const restoringFocus = useRef(false);
  if (!session) throw new Error("Browse results search requires a search session");
  const { draft, setDraft, applied, editor, setEditor, search, voice, endingSoon } = session;
  const connectField = useCallback((node: HTMLInputElement | null) => {
    if (node && !field.current && node.value !== node.defaultValue) {
      const typed = node.value;
      queueMicrotask(() => setDraft(typed));
    }
    field.current = node;
  }, [setDraft]);
  const editing = editor === position;
  const tooLong = catalogSearchTooLong(draft.trim());
  const invalid = invalidCatalogSearch(draft);
  const showLimit = (tooLong || invalid) && (editing || editor === null && position === "top");
  const limitId = `${id}-limit`;
  const label = retailerScope ? `Search ${retailerScope}${endingSoon ? " in Ending Soon" : ""}`
    : endingSoon ? "Search all Ending Soon prizes" : "Search these prizes";
  const inputId = position === "bottom" ? endingSoon ? "ending-soon-search-input" : "browse-search-input" : id;
  function edit() {
    if (!editing && !restoringFocus.current) { voice.cancel(); setEditor(position); }
  }
  function close(keepKeyboardFocus: boolean) {
    voice.reset();
    setDraft(applied);
    setEditor(null);
    if (keepKeyboardFocus) {
      restoringFocus.current = true;
      field.current?.focus({ preventScroll: true });
      restoringFocus.current = false;
    } else {
      field.current?.blur();
    }
  }
  return <><form role="search" className={`${styles.search} ${styles.resultsSearch}`} aria-label={endingSoon ? `Search Ending Soon at the ${position}` : `Search browse results at the ${position}`}
    action="/browse#search-results" method="get"
    onSubmit={event => { event.preventDefault(); if (voice.busy || (!draft.trim() && !applied)) return; if (tooLong || invalid) { field.current?.focus(); return; } if (!draft.trim()) { search("", position === "bottom" ? inputId : undefined, position === "top", position === "bottom" ? inputId : undefined); return; } field.current?.blur(); setEditor(null); search(draft, undefined, false, position === "bottom" ? inputId : undefined); }}
    onKeyDown={event => {
      if (event.key !== "Escape" || (!editing && event.target !== field.current)) return;
      event.preventDefault();
      close(true);
    }}>
    <BrowseSearchScope href={session.browseHref} />
    <label className={styles.srOnly} htmlFor={inputId}>{label}</label>
    <input id={inputId} ref={connectField} type="search" name="q" value={draft} maxLength={maxCatalogSearchLength} aria-invalid={tooLong || invalid || undefined} aria-describedby={showLimit ? limitId : undefined} placeholder={label}
      enterKeyHint="search" autoComplete="off" onFocus={edit} onChange={event => { if (!editing) edit(); voice.reset(); setDraft(event.target.value); }} />
    {draft || applied ? <button className={styles.clearSearch} type="button" aria-label="Clear search" title="Clear search"
      onClick={() => { voice.reset(); setDraft(""); field.current?.focus(); search("", position === "bottom" ? inputId : undefined, position === "top", position === "bottom" ? inputId : undefined); }}>×</button> : null}
    {draft.trim() && !voice.busy && !tooLong && !invalid ? <button type="submit" className={styles.go} aria-label="Go to search results">Go</button> : null}
    <VoiceSearchControl listening={editing && voice.listening} finishing={editing && voice.finishing} error={editing ? voice.error : ""}
      toggle={() => {
        if (!editing && voice.listening) { edit(); return; }
        setEditor(position);
        voice.toggle();
      }} />
    {editing ? <button className={styles.closeSearch} type="button" aria-label="Close search" title="Close search" onClick={event => close(event.detail === 0)}>×</button> : null}
  </form>{showLimit ? <p id={limitId} role="status" className="mb-2 text-sm font-bold text-amber-100">{invalid ? invalidCatalogSearchMessage : catalogSearchLimitMessage}</p> : null}</>;
}
