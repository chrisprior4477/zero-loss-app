"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { searchExamples, searchResultsHref } from "@/lib/navigation/search-examples";

type SpeechResultEvent = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function HeaderMicrophoneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6" fill="none">
      <rect x="10" y="2" width="12" height="18" rx="6" fill="currentColor" />
      <path
        d="M6 14v1.5a10 10 0 0 0 20 0V14M16 25.5V30M10 30h12"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type SearchOptions = { inputId?: string; active?: boolean; onActivate?: () => void; onSubmitted?: () => void; onDismiss?: () => void };
function HeaderSearchForm({ inputId, initialQuery, active, onActivate, onSubmitted, onDismiss, navigate }: SearchOptions & { inputId: string; initialQuery: string; navigate?: (href: string) => void }) {
  const [query, setQuery] = useState(initialQuery);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [voiceError, setVoiceError] = useState("");
  const [suggestions, setSuggestions] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!suggestions) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !formRef.current?.contains(event.target)) setSuggestions(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [suggestions]);
  useEffect(() => () => { recognitionRef.current?.stop(); }, []);
  useEffect(() => {
    if (active === false) {
      recognitionRef.current?.stop();
      inputRef.current?.blur();
    }
  }, [active]);

  const toggleVoiceSearch = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!Recognition) { setVoiceError("Voice search is unavailable in this browser. Please type your search."); inputRef.current?.focus(); return; }
    setVoiceError("");
    setSuggestions(false);
    onActivate?.();

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setQuery(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => { setIsListening(false); setVoiceError("Voice search could not start. Please try again or type your search."); };
    recognitionRef.current = recognition;
    setIsListening(true);
    try { recognition.start(); } catch { setIsListening(false); setVoiceError("Voice search could not start. Please type your search."); }
  };

  return (
    <form
      ref={formRef}
      action="/browse"
      method="get"
      onSubmit={event => {
        setSuggestions(false);
        recognitionRef.current?.stop();
        inputRef.current?.blur();
        onSubmitted?.();
        if (navigate) { event.preventDefault(); navigate(searchResultsHref(query)); }
      }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSuggestions(false); }}
      onKeyDown={event => { if (event.key === "Escape") { setSuggestions(false); if (onDismiss) { event.preventDefault(); recognitionRef.current?.stop(); onDismiss(); } } }}
      className="relative mx-auto flex h-9 min-w-0 max-w-[760px] flex-1 items-center rounded-full bg-[#f5f7fa] px-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)] sm:h-10 sm:min-w-[240px] sm:px-4"
    >
      <button type="submit" aria-label="Search catalog" title="Search catalog" className="relative mr-3 h-5 w-5 shrink-0 text-[#087feb]">
        <span className="absolute left-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-current" />
        <span className="absolute left-[12px] top-[12px] h-0.5 w-2 origin-left rotate-45 rounded-full bg-current" />
      </button>
      <label htmlFor={inputId} className="sr-only">Search products, brands, and categories</label>
      <input
        ref={inputRef}
        id={inputId}
        name="q"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(event) => { setQuery(event.target.value); setSuggestions(false); }}
        onFocus={() => { onActivate?.(); setSuggestions(true); }}
        onClick={() => setSuggestions(true)}
        aria-controls={suggestions && active !== false ? `${inputId}-suggestions` : undefined}
        enterKeyHint="search"
        placeholder="Search products, brands, and categories..."
        className="min-w-0 flex-1 bg-transparent text-[14px] text-[#00132e] outline-none placeholder:text-slate-500"
      />
      {query.trim() && !isListening ? (
        <button type="submit" aria-label="Go to search results" className="ml-2 min-h-8 shrink-0 rounded-full bg-[#087feb] px-3 text-sm font-black text-white transition hover:bg-[#005fc4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087feb]">
          Go
        </button>
      ) : <button
        type="button"
        onClick={toggleVoiceSearch}
        aria-label={isListening ? "Stop voice search" : "Start voice search"}
        aria-pressed={isListening}
        title="Search with your voice"
        className={`relative ml-3 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${
          isListening
            ? "bg-[var(--live)] text-[#00132e]"
            : "text-[#087feb] hover:bg-[#087feb]/10"
        }`}
      >
        <HeaderMicrophoneIcon />
      </button>}
      {onDismiss ? <button type="button" aria-label="Close search" onClick={() => { recognitionRef.current?.stop(); onDismiss(); }} className="ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xl text-[#00132e] hover:bg-slate-200">×</button> : null}
      {suggestions && active !== false ? <div id={`${inputId}-suggestions`} role="group" aria-label="Try a search" className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-cyan-300 bg-[#052749] p-2 text-white shadow-xl">
        <p className="px-2 py-1 text-xs font-bold text-cyan-200">Try a search</p>
        {searchExamples.map(example => <button key={example} type="button" className="block min-h-9 w-full rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-[#124674] focus-visible:bg-[#124674] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" onPointerDown={event => event.preventDefault()} onClick={() => { setQuery(example); inputRef.current?.focus(); setSuggestions(false); }}>{example}</button>)}
      </div> : null}
      {voiceError ? <span role="status" className="absolute left-2 right-2 top-full rounded-lg bg-white p-3 text-sm text-[#00132e] shadow-lg">{voiceError}</span> : null}
    </form>
  );
}

export function DesktopHeaderSearch({ inputId = "desktop-header-search", ...options }: SearchOptions) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentQuery = pathname === "/browse" ? searchParams.get("q")?.trim() ?? "" : "";
  return <HeaderSearchForm key={`${pathname}:${currentQuery}`} inputId={inputId} initialQuery={currentQuery} {...options} navigate={href => router.push(href)} />;
}

export function DesktopHeaderSearchFallback({ inputId = "desktop-header-search", initialQuery = "", ...options }: SearchOptions & { initialQuery?: string; navigate?: (href: string) => void }) {
  return <HeaderSearchForm inputId={inputId} initialQuery={initialQuery} {...options} />;
}
