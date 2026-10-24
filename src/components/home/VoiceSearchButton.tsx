"use client";

import { useVoiceSearch } from "@/components/search/useVoiceSearch";

export function VoiceSearchButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const voice = useVoiceSearch(onTranscript);
  return <span className="relative flex shrink-0 items-center">
    <button type="button" onClick={voice.toggle} aria-pressed={voice.listening}
      aria-label={voice.listening ? "Stop voice search" : "Start voice search"}
      title={voice.listening ? "Listening — tap to stop" : "Search with your voice"}
      className={`flex h-11 w-9 shrink-0 items-center justify-center rounded-md text-[#087feb] hover:bg-[#087feb]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087feb] ${voice.listening ? "zl-pulse-live" : ""}`}>
      <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6" fill="none">
        <rect x="10" y="2" width="12" height="18" rx="6" fill="currentColor" />
        <path d="M6 14v1.5a10 10 0 0 0 20 0V14M16 25.5V30M10 30h12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    {voice.error ? <span role="status" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl bg-white p-3 text-sm text-[#00132e] shadow-xl">{voice.error}</span> : null}
  </span>;
}
