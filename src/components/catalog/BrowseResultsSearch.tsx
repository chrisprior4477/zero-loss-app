"use client";

import { createContext, useContext, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { VoiceSearchControl } from "@/components/home/VoiceSearchButton";
import { useVoiceSearch } from "@/components/search/useVoiceSearch";
import styles from "./browse-discovery.module.css";

type Position = "top" | "bottom";
type SearchSession = {
  draft: string; setDraft: (value: string) => void; applied: string;
  editor: Position | null; setEditor: (value: Position | null) => void;
  search: (value: string, anchor?: string) => void; voice: ReturnType<typeof useVoiceSearch>; endingSoon: boolean;
};
const Session = createContext<SearchSession | null>(null);

export function BrowseResultsSearchSession({ browseHref, searchTerm, endingSoon = false, children }: {
  browseHref: string; searchTerm: string; endingSoon?: boolean; children: ReactNode;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(searchTerm);
  const [editor, setEditor] = useState<Position | null>(null);
  const voice = useVoiceSearch(setDraft);
  function search(value: string, anchor = "search-results") {
    const term = value.trim();
    voice.cancel();
    setDraft(term);
    const url = new URL(browseHref, "https://zeroloss.local");
    if (term) url.searchParams.set("q", term); else url.searchParams.delete("q");
    // A new search starts at the first batch, retaining the shopper's filters.
    url.searchParams.delete("batch");
    router.push(`${url.pathname}${url.search}#${anchor}`, { scroll: false });
    if (term === searchTerm) document.getElementById(anchor)?.scrollIntoView?.({ block: "start" });
  }
  return <Session.Provider value={{ draft, setDraft, applied: searchTerm, editor, setEditor, search, voice, endingSoon }}>{children}</Session.Provider>;
}

export function BrowseResultsSearch({ position }: { position: Position }) {
  const session = useContext(Session);
  const id = useId();
  const field = useRef<HTMLInputElement>(null);
  if (!session) throw new Error("Browse results search requires a search session");
  const { draft, setDraft, applied, editor, setEditor, search, voice, endingSoon } = session;
  const editing = editor === position;
  const label = endingSoon ? "Search all Ending Soon prizes" : "Search these prizes";
  const inputId = position === "bottom" ? endingSoon ? "ending-soon-search-input" : "browse-search-input" : id;
  function edit() {
    if (!editing) { voice.cancel(); setEditor(position); }
  }
  function close() {
    voice.cancel();
    setDraft(applied);
    setEditor(null);
    field.current?.blur();
  }
  return <form role="search" className={`${styles.search} ${styles.resultsSearch}`} aria-label={endingSoon ? `Search Ending Soon at the ${position}` : `Search browse results at the ${position}`}
    onSubmit={event => { event.preventDefault(); field.current?.blur(); setEditor(null); search(draft); }}
    onKeyDown={event => { if (event.key === "Escape" && editing) { event.preventDefault(); close(); } }}>
    <label className={styles.srOnly} htmlFor={inputId}>{label}</label>
    <input id={inputId} ref={field} type="search" name="q" value={draft} placeholder={label}
      enterKeyHint="search" autoComplete="off" onFocus={edit} onChange={event => { voice.cancel(); setDraft(event.target.value); }} />
    {draft || applied ? <button className={styles.clearSearch} type="button" aria-label="Clear search" title="Clear search"
      onClick={() => { voice.cancel(); setDraft(""); field.current?.focus(); if (applied) search("", position === "bottom" ? inputId : undefined); }}>×</button> : null}
    {draft.trim() && !(editing && voice.listening) ? <button type="submit" className={styles.go} aria-label="Go to search results">Go</button> : null}
    <VoiceSearchControl listening={voice.listening} error={editing ? voice.error : ""}
      toggle={() => { setEditor(position); voice.toggle(); }} />
    {editing ? <button className={styles.closeSearch} type="button" aria-label="Close search" title="Close search" onClick={close}>×</button> : null}
  </form>;
}
