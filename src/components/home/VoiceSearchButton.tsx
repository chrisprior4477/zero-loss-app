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
    <span
      aria-hidden="true"
      className="relative block h-[19px] w-3 shrink-0"
    >
      <span
        className="absolute left-[2px] top-0 block h-[11px] w-2 rounded"
        style={{ background: color }}
      />
      <span
        className="absolute left-0 top-2 box-border block h-[7px] w-3 rounded-b-lg border-2 border-t-0"
        style={{ borderColor: color }}
      />
      <span
        className="absolute left-[5px] top-[15px] block h-1 w-0.5"
        style={{ background: color }}
      />
    </span>
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
