"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void; abort?: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

/** Shared by header, hero and Browse; transcript is reviewed before pressing Go. */
export function useVoiceSearch(onTranscript: (text: string) => void) {
  const recognitionRef = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const cancel = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = recognition.onerror = recognition.onend = null;
      try { if (recognition.abort) recognition.abort(); else recognition.stop(); } catch { /* Already stopped by the browser. */ }
    }
    setListening(false);
  }, []);
  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      // Stop captures the final words; browsers may return them after stop().
      try { recognition.stop(); } catch { cancel(); }
    }
    setListening(false);
  }, [cancel]);
  useEffect(() => () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;
    recognition.onresult = recognition.onerror = recognition.onend = null;
    try { if (recognition.abort) recognition.abort(); else recognition.stop(); } catch { /* Already stopped by the browser. */ }
  }, []);

  function toggle() {
    if (listening) { stop(); return; }
    // A new session supersedes any final result still pending from the last one.
    cancel();
    setError("");
    const browser = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor) { setError("Voice search isn’t available in this browser. Try Chrome or Edge, or type your search."); return; }
    const recognition = new Constructor();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = event => {
      if (recognitionRef.current !== recognition) return;
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) onTranscript(text);
      cancel();
    };
    recognition.onerror = event => {
      if (recognitionRef.current !== recognition) return;
      setError(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Allow microphone access in your browser to use voice search, or type your search."
        : event.error === "no-speech" ? "No speech was heard. Try the microphone again or type your search."
        : "Voice search couldn’t connect. Try again or type your search.");
      cancel();
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      recognition.onresult = recognition.onerror = recognition.onend = null;
      setListening(false);
    };
    setListening(true);
    try { recognition.start(); } catch { cancel(); setError("Voice search couldn’t start. Try again or type your search."); }
  }
  return { listening, error, toggle, stop, cancel };
}
