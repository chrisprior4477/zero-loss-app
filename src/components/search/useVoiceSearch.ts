"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

/** Shared by header, hero and Browse; transcript is reviewed before pressing Go. */
export function useVoiceSearch(onTranscript: (text: string) => void) {
  const recognitionRef = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = recognition.onerror = recognition.onend = null;
      try { recognition.stop(); } catch { /* Already stopped by the browser. */ }
    }
    setListening(false);
  }, []);
  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = recognition.onerror = recognition.onend = null;
      try { recognition.stop(); } catch { /* Already stopped by the browser. */ }
    }
  }, []);

  function toggle() {
    if (listening) { stop(); return; }
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
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) onTranscript(text);
      stop();
    };
    recognition.onerror = event => {
      setError(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Allow microphone access in your browser to use voice search, or type your search."
        : event.error === "no-speech" ? "No speech was heard. Try the microphone again or type your search."
        : "Voice search couldn’t connect. Try again or type your search.");
      stop();
    };
    recognition.onend = () => { recognitionRef.current = null; setListening(false); };
    setListening(true);
    try { recognition.start(); } catch { stop(); setError("Voice search couldn’t start. Try again or type your search."); }
  }
  return { listening, error, toggle, stop };
}
