"use client";

import { useRef, useState } from "react";

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

export function DesktopHeaderSearch() {
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

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

    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setQuery(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  return (
    <form
      action="/browse"
      className="mx-auto flex h-9 min-w-0 max-w-[760px] flex-1 items-center rounded-full bg-[#f5f7fa] px-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)] sm:h-10 sm:min-w-[240px] sm:px-4"
    >
      <span aria-hidden="true" className="relative mr-3 h-5 w-5 shrink-0 text-[#087feb]">
        <span className="absolute left-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-current" />
        <span className="absolute left-[12px] top-[12px] h-0.5 w-2 origin-left rotate-45 rounded-full bg-current" />
      </span>
      <label htmlFor="desktop-header-search" className="sr-only">Search products, brands, and categories</label>
      <input
        id="desktop-header-search"
        name="q"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products, brands, and categories..."
        className="min-w-0 flex-1 bg-transparent text-[14px] text-[#00132e] outline-none placeholder:text-slate-500"
      />
      <button
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
        <span aria-hidden="true" className="relative block h-5 w-4">
          <span className="absolute left-1/2 top-0 h-3.5 w-2 -translate-x-1/2 rounded-full border-2 border-current" />
          <span className="absolute left-1/2 top-[10px] h-2.5 w-3 -translate-x-1/2 rounded-b-full border-b-2 border-x-2 border-current" />
          <span className="absolute bottom-0 left-1/2 h-1.5 w-0.5 -translate-x-1/2 bg-current" />
        </span>
      </button>
    </form>
  );
}
