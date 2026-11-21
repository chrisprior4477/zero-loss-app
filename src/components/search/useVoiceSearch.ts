"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void; abort?: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

let cancelActiveVoice: (() => void) | null = null;
const noSpeech = "No speech was heard. Try the microphone again or type your search.";

/** Shared by header, hero and Browse; transcript is reviewed before pressing Go. */
export function useVoiceSearch(onTranscript: (text: string) => void) {
  const recognitionRef = useRef<Recognition | null>(null);
  const [phase, setPhase] = useState<"idle" | "listening" | "finishing">("idle");
  const listening = phase === "listening";
  const [error, setError] = useState("");
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const release = useCallback(() => {
    if (finishTimer.current !== null) clearTimeout(finishTimer.current);
    finishTimer.current = null;
  }, []);
  const cancel = useCallback(function cancelSession() {
    release();
    if (cancelActiveVoice === cancelSession) cancelActiveVoice = null;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = recognition.onerror = recognition.onend = null;
      try { if (recognition.abort) recognition.abort(); else recognition.stop(); } catch { /* Already stopped by the browser. */ }
    }
    setPhase("idle");
  }, [release]);
  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition && listening) {
      // Stop captures the final words; browsers may return them after stop().
      setPhase("finishing");
      finishTimer.current = setTimeout(() => {
        cancel();
        setError("Voice search didn’t finish. Try the microphone again or type your search.");
      }, 3500);
      try { recognition.stop(); } catch {
        cancel();
        setError("Voice search couldn’t finish. Try again or type your search.");
      }
    }
  }, [cancel, listening]);
  function reset() {
    cancel();
    setError("");
  }
  useEffect(() => () => {
    release();
    if (cancelActiveVoice === cancel) cancelActiveVoice = null;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;
    recognition.onresult = recognition.onerror = recognition.onend = null;
    try { if (recognition.abort) recognition.abort(); else recognition.stop(); } catch { /* Already stopped by the browser. */ }
  }, [cancel, release]);

  function toggle() {
    if (listening) { stop(); return; }
    if (phase === "finishing") return;
    cancel();
    setError("");
    const browser = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor) { setError("Voice search isn’t available in this browser. Try Chrome or Edge, or type your search."); return; }
    cancelActiveVoice?.();
    const recognition = new Constructor();
    cancelActiveVoice = cancel;
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = event => {
      if (recognitionRef.current !== recognition) return;
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) onTranscript(text);
      else setError(noSpeech);
      cancel();
    };
    recognition.onerror = event => {
      if (recognitionRef.current !== recognition) return;
      setError(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Allow microphone access in your browser to use voice search, or type your search."
        : event.error === "no-speech" ? noSpeech
        : "Voice search couldn’t connect. Try again or type your search.");
      cancel();
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      setError(noSpeech);
      cancel();
    };
    setPhase("listening");
    try { recognition.start(); } catch { cancel(); setError("Voice search couldn’t start. Try again or type your search."); }
  }
  return { listening, finishing: phase === "finishing", busy: phase !== "idle", error, toggle, stop, cancel, reset };
}
