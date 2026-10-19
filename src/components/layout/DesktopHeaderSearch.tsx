"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

type SearchOptions = { inputId?: string; onActivate?: () => void; onSubmitted?: () => void; onDismiss?: () => void };
function HeaderSearchForm({ inputId, initialQuery, onActivate, onSubmitted, onDismiss, navigate }: SearchOptions & { inputId: string; initialQuery: string; navigate?: (href: string) => void }) {
  const [query, setQuery] = useState(initialQuery);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [voiceError, setVoiceError] = useState("");
  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

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
      action="/browse"
      method="get"
      onSubmit={event => {
        recognitionRef.current?.stop();
        inputRef.current?.blur();
        onSubmitted?.();
        if (navigate) { event.preventDefault(); navigate(`/browse?${new URLSearchParams({ q: query.trim() })}`); }
      }}
      onKeyDown={event => { if (event.key === "Escape" && onDismiss) { event.preventDefault(); recognitionRef.current?.stop(); onDismiss(); } }}
      className="mx-auto flex h-9 min-w-0 max-w-[760px] flex-1 items-center rounded-full bg-[#f5f7fa] px-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)] sm:h-10 sm:min-w-[240px] sm:px-4"
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
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={onActivate}
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

export function DesktopHeaderSearchFallback({ inputId = "desktop-header-search", ...options }: SearchOptions) {
  return <HeaderSearchForm inputId={inputId} initialQuery="" {...options} />;
}
