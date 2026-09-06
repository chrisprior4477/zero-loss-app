"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Voice input for the hero search field.
 *
 * The mic glyph is the artboard's: an orange capsule, a U-shaped cradle, and
 * a short stem. The artboard only reveals it while the field has focus; here
 * it is always visible, on mobile and desktop, because it is a control people
 * are meant to reach for directly rather than discover after focusing.
 *
 * Speech recognition is progressively enhanced. `SpeechRecognition` requires
 * both browser support and a SECURE CONTEXT — https, or localhost. Served
 * over plain http from a LAN address (as during phone testing) the API is
 * unavailable, so the button renders as a decorative glyph rather than a dead
 * control that silently does nothing. It becomes live automatically once the
 * page is served over https.
 */

type MinimalRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => MinimalRecognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext) return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function MicGlyph({ listening }: { listening: boolean }) {
  const color = listening ? "var(--live)" : "var(--urgent)";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="block h-5 w-5 shrink-0"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="8" y="2.5" width="8" height="12" rx="4" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3.5M8.5 21.5h7" />
    </svg>
  );
}

export function VoiceSearchButton({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  /* The server renders the decorative glyph; the client swaps in the live
     control only where speech recognition can actually run. Kept as a
     render-time decision via useSyncExternalStore rather than a post-mount
     setState, which would cascade an extra render. */
  const supported = useSyncExternalStore(
    () => () => {},
    () => getRecognitionCtor() !== null,
    () => false
  );
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<MinimalRecognition | null>(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) onTranscript(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  /* Decorative when speech recognition cannot run, so the field still matches
     the design instead of offering a control that would do nothing. */
  if (!supported) {
    return (
      <span className="flex shrink-0 items-center pr-0.5">
        <MicGlyph listening={false} />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={listening}
      aria-label={listening ? "Stop voice search" : "Search by voice"}
      title={listening ? "Listening — tap to stop" : "Search by voice"}
      className={`flex h-11 w-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[rgba(0,48,95,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
        listening ? "zl-pulse-live" : ""
      }`}
    >
      <MicGlyph listening={listening} />
    </button>
  );
}
