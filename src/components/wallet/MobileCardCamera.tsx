"use client";

import { useRef, useState } from "react";
import { DEMO_CARD_COLORS, type DemoCardArtwork as Artwork, type DemoCardToken } from "@/lib/payments/demo-card";
import { DemoCardArtwork } from "./DemoCardArtwork";
import popupStyles from "@/components/layout/responsive-popup.module.css";
import styles from "./mobile-card-camera.module.css";

// Reduce a photo to four broad, fixed palette colors. No image or readable text
// survives this operation or leaves the browser; only eight indices can be saved.
async function sampleColors(file: File): Promise<number[]> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo to continue.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Try a smaller photo (under 25 MB).");
  const url = URL.createObjectURL(file);
  const photo = new Image();
  const canvas = document.createElement("canvas");
  try {
    photo.src = url;
    await photo.decode();
    canvas.width = 2; canvas.height = 2;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Photo preview is unavailable. You can still add a sample card manually.");
    context.drawImage(photo, 0, 0, 2, 2);
    const pixels = context.getImageData(0, 0, 2, 2).data;
    return [0, 1, 2, 3].map(pixel => {
      let best = 0; let distance = Infinity;
      DEMO_CARD_COLORS.forEach((hex, index) => {
        const rgb = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));
        const delta = rgb.reduce((sum, color, channel) => sum + (color - pixels[pixel * 4 + channel]) ** 2, 0);
        if (delta < distance) { best = index; distance = delta; }
      });
      return best;
    });
  } finally { photo.src = ""; canvas.width = 0; canvas.height = 0; URL.revokeObjectURL(url); }
}

export function MobileCardCamera({ token, disabled, onUse }: { token: DemoCardToken; disabled?: boolean; onUse: (artwork: Artwork) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const captureVersion = useRef(0);
  const [front, setFront] = useState<number[] | null>(null);
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [back, setBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function reset() { captureVersion.current++; setFront(null); setArtwork(null); setBack(false); setBusy(false); setError(""); if (input.current) input.current.value = ""; }
  function close() { reset(); dialog.current?.close(); }
  return <>
    <button type="button" className={styles.trigger} disabled={disabled} aria-label="Use camera" onClick={() => { reset(); dialog.current?.showModal(); }}>
      <span className={styles.camera} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 5 9.5 3h5L16 5h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="4" /></svg></span><span className={styles.label} aria-hidden="true">Use camera</span>
    </button>
    <dialog ref={dialog} className={`${styles.dialog} ${popupStyles.dialog}`} aria-label="Sample card camera" onCancel={event => { event.preventDefault(); close(); }}>
      <button type="button" className={styles.close} aria-label="Close camera" onClick={close}>×</button>
      <p className={styles.eyebrow}>SAMPLE CARD CAMERA</p>
      <h2>{artwork ? "Your sample card" : front ? "Now capture the back" : "Capture the front"}</h2>
      <p>{artwork ? "We recreated the colors with fake details. The original photos are discarded." : front ? "Flip the card over and fill the photo with its back." : "Fill the photo with the front of your card. This creates a demo card with fake details."}</p>
      {artwork ? <><DemoCardArtwork token={token} artwork={artwork} back={back} /><button type="button" className={styles.flip} onClick={() => setBack(value => !value)}>See {back ? "front" : "back"}</button></> : <div className={styles.captureGuide}><span aria-hidden="true">{front ? "02" : "01"}</span><strong>{front ? "Back of card" : "Front of card"}</strong><small>Photos stay on your device. Only sample colors and a fake card reference are saved.</small></div>}
      <input ref={input} type="file" accept="image/*" capture="environment" aria-label={front ? "Back of card photo" : "Front of card photo"} className={styles.file} onChange={async event => {
        const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
        if (!file) return;
        const version = ++captureVersion.current;
        setBusy(true); setError("");
        try {
          const colors = await sampleColors(file);
          if (version !== captureVersion.current) return;
          if (front) setArtwork([...front, ...colors] as Artwork); else setFront(colors);
        } catch { if (version === captureVersion.current) setError("We couldn’t read that photo. Try a JPG or PNG, or add a sample card manually."); }
        finally { if (version === captureVersion.current) setBusy(false); }
      }} />
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <button type="button" className={styles.primary} disabled={busy || disabled} onClick={() => { if (artwork) { onUse(artwork); close(); } else input.current?.click(); }}>{busy ? "Creating sample colors…" : artwork ? "Use this sample card" : front ? "Take back photo" : "Take front photo"}</button>
      <button type="button" className={styles.cancel} onClick={artwork || front ? reset : close}>{artwork || front ? "Start again" : "Cancel"}</button>
      <p className={styles.note}>No real card number, name, expiry or security code is saved. Review and save the sample card on the next screen.</p>
    </dialog>
  </>;
}
