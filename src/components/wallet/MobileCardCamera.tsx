"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_CARD_COLORS, demoCardFixture, type DemoCard, type DemoCardArtwork as Artwork, type DemoCardToken } from "@/lib/payments/demo-card";
import { saveDemoPaymentMethod } from "@/lib/payments/actions";
import { DemoCardArtwork } from "./DemoCardArtwork";
import popupStyles from "@/components/layout/responsive-popup.module.css";
import styles from "./mobile-card-camera.module.css";

// Four palette indices per side: no image or readable text survives or is uploaded.
function palette(pixels: Uint8ClampedArray): number[] {
  return [0, 1, 2, 3].map(pixel => {
    let best = 0; let distance = Infinity;
    DEMO_CARD_COLORS.forEach((hex, index) => {
      const rgb = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));
      const delta = rgb.reduce((sum, color, channel) => sum + (color - pixels[pixel * 4 + channel]) ** 2, 0);
      if (delta < distance) { best = index; distance = delta; }
    });
    return best;
  });
}

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
    return palette(context.getImageData(0, 0, 2, 2).data);
  } finally { photo.src = ""; canvas.width = 0; canvas.height = 0; URL.revokeObjectURL(url); }
}

export function MobileCardCamera({ token, savedCard, disabled, displayName, makeDefault = savedCard?.isDefault ?? true, makeDepositDefault = savedCard ? savedCard.isDepositDefault ?? savedCard.isDefault : true, onSaved }: {
  token: DemoCardToken; savedCard?: DemoCard; disabled?: boolean; displayName?: string; makeDefault?: boolean; makeDepositDefault?: boolean; onSaved: (card: DemoCard) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const guide = useRef<HTMLDivElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const captureVersion = useRef(0);
  const savingRef = useRef(false);
  const [cameraToken, setCameraToken] = useState(token);
  const [futureTransactions, setFutureTransactions] = useState(makeDefault);
  const [futureDeposits, setFutureDeposits] = useState(makeDepositDefault);
  const [saving, setSaving] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<"off" | "starting" | "live">("off");
  const [front, setFront] = useState<number[] | null>(null);
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [back, setBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function stopCamera() {
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCameraStatus("off");
  }
  useEffect(() => {
    function suspend() {
      if (!document.hidden) return;
      captureVersion.current++;
      stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
      setCameraStatus("off");
    }
    document.addEventListener("visibilitychange", suspend);
    return () => {
      // This operation counter must invalidate the latest request, not its mount-time value.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      captureVersion.current++;
      stream.current?.getTracks().forEach(track => track.stop()); document.removeEventListener("visibilitychange", suspend);
    };
  }, []);
  async function startCamera() {
    const version = ++captureVersion.current;
    stopCamera(); setError("");
    if (!navigator.mediaDevices?.getUserMedia) { setError("Live camera isn’t available in this browser. Use your phone’s camera or choose a photo below."); return; }
    setCameraStatus("starting");
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
      if (version !== captureVersion.current || !dialog.current?.open || !video.current) { cameraStream.getTracks().forEach(track => track.stop()); return; }
      stream.current = cameraStream;
      video.current.srcObject = cameraStream;
      await video.current.play();
      if (version === captureVersion.current) setCameraStatus("live");
    } catch (cause) {
      if (version !== captureVersion.current) return;
      stopCamera();
      setError(cause instanceof DOMException && cause.name === "NotAllowedError"
        ? "Camera access wasn’t allowed. Enable it in your browser’s site settings, or use a photo below."
        : "The live camera couldn’t open. Try again, or use your phone’s camera or a photo below.");
    }
  }
  function reset() { captureVersion.current++; stopCamera(); setFront(null); setArtwork(null); setBack(false); setBusy(false); setError(""); if (input.current) input.current.value = ""; }
  function close() { if (savingRef.current) return; reset(); dialog.current?.close(); }
  function acceptColors(colors: number[]) {
    if (front) { setArtwork([...front, ...colors] as Artwork); stopCamera(); }
    else setFront(colors);
  }
  function capturePhoto() {
    const source = video.current;
    const frame = guide.current;
    if (!source?.videoWidth || !source.videoHeight || !frame) { setError("The camera is getting ready. Try taking the photo again."); return; }
    const canvas = document.createElement("canvas"); canvas.width = 2; canvas.height = 2;
    try {
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("No canvas");
      const view = source.getBoundingClientRect(); const crop = frame.getBoundingClientRect();
      const scale = Math.max(view.width / source.videoWidth, view.height / source.videoHeight);
      const x = (source.videoWidth - view.width / scale) / 2 + (crop.left - view.left) / scale;
      const y = (source.videoHeight - view.height / scale) / 2 + (crop.top - view.top) / scale;
      context.drawImage(source, x, y, crop.width / scale, crop.height / scale, 0, 0, 2, 2);
      acceptColors(palette(context.getImageData(0, 0, 2, 2).data)); setError("");
    } catch { setError("That photo wasn’t ready. Try again, or choose a photo below."); }
    finally { canvas.width = 0; canvas.height = 0; }
  }
  async function saveCard() {
    if (!artwork || savingRef.current || disabled) return;
    savingRef.current = true; setSaving(true); setError("");
    const fixture = demoCardFixture(cameraToken)!;
    const data = new FormData();
    data.set("paymentMethod", fixture.token);
    data.set("makeDefault", String(futureTransactions));
    data.set("makeDepositDefault", String(futureDeposits));
    data.set("artwork", JSON.stringify(artwork));
    try {
      const result = await saveDemoPaymentMethod({ status: "idle" }, data);
      if (result.status !== "succeeded") { setError(result.status === "idle" ? "The card was not saved. Please try again." : result.message); return; }
      const card: DemoCard = { token: fixture.token, lastFour: fixture.lastFour, isDefault: futureTransactions, isDepositDefault: futureDeposits, artwork };
      savingRef.current = false; setSaving(false); close(); onSaved(card);
    } catch { setError("The card could not be saved. Your preview is still here—please try again."); }
    finally { savingRef.current = false; setSaving(false); }
  }
  return <>
    <button type="button" className={styles.trigger} disabled={disabled || saving} aria-label="Use camera" onClick={() => { reset(); setCameraToken(token); setFutureTransactions(makeDefault); setFutureDeposits(makeDepositDefault); dialog.current?.showModal(); void startCamera(); }}>
      <span className={styles.camera} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 5 9.5 3h5L16 5h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="4" /></svg></span><span className={styles.label} aria-hidden="true">Use camera</span>
    </button>
    <dialog ref={dialog} className={`${styles.dialog} ${popupStyles.dialog}`} aria-label="Sample card camera" onCancel={event => { event.preventDefault(); close(); }}>
      <button type="button" className={styles.close} disabled={saving} aria-label="Close camera" onClick={close}>×</button>
      <p className={styles.eyebrow}>SAMPLE CARD CAMERA</p>
      <h2>{artwork ? "Your sample card" : front ? "Now capture the back" : "Capture the front"}</h2>
      {savedCard ? <p><strong>This updates your saved {demoCardFixture(cameraToken)?.issuer} •••• {demoCardFixture(cameraToken)?.lastFour}.</strong> No additional card is added.</p> : null}
      <p>{artwork ? "We recreated the colors with fake details. The original photos are discarded." : front ? "Front captured. Flip your pretend card over and line up the back." : "Use any pretend card—even one drawn on paper. No real bank card needed. Allow camera access when your phone asks."}</p>
      {artwork ? <><p className={styles.issuer}><strong>{demoCardFixture(cameraToken)?.issuer} •••• {demoCardFixture(cameraToken)?.lastFour}</strong></p><DemoCardArtwork token={cameraToken} artwork={artwork} back={back} cardholder={displayName} /><button type="button" className={styles.flip} onClick={() => setBack(value => !value)}>See {back ? "front" : "back"}</button></> : <>
        <div className={styles.viewfinder} aria-label={`Align the ${front ? "back" : "front"} of your pretend card inside the corner guides`}>
          <video ref={video} autoPlay muted playsInline aria-label="Live card camera" />
          <div ref={guide} className={styles.cornerGuide} aria-hidden="true"><i /><i /><i /><i /></div>
          <span className={styles.sideLabel}>{front ? "02 · Back of card" : "01 · Front of card"}</span>
          {cameraStatus !== "live" ? <span className={styles.cameraHint}>{cameraStatus === "starting" ? "Allow camera access on your phone" : "Camera preview"}</span> : null}
        </div>
        <p className={styles.captureNote} role="status">{front ? "Front captured · Back next" : "Line up the front inside the four corners."}</p>
      </>}
      <input ref={input} type="file" accept="image/*" capture="environment" aria-label={front ? "Back of card photo" : "Front of card photo"} hidden style={{ display: "none" }} disabled={busy || saving} onChange={async event => {
        const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
        if (!file) return;
        const version = ++captureVersion.current;
        setBusy(true); setError("");
        try {
          const colors = await sampleColors(file);
          if (version !== captureVersion.current) return;
          acceptColors(colors);
        } catch { if (version === captureVersion.current) setError("We couldn’t read that photo. Try a JPG or PNG, or add a sample card manually."); }
        finally { if (version === captureVersion.current) setBusy(false); }
      }} />
      {artwork ? <div className={styles.preferences}>
        <label><input type="checkbox" checked={futureTransactions} disabled={saving} onChange={event => setFutureTransactions(event.target.checked)} />Use this card for future transactions</label>
        <label><input type="checkbox" checked={futureDeposits} disabled={saving} onChange={event => setFutureDeposits(event.target.checked)} />Use this card for deposits</label>
      </div> : null}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <button type="button" className={styles.primary} disabled={busy || saving || disabled || cameraStatus === "starting"} onClick={() => { if (artwork) void saveCard(); else if (cameraStatus === "live") capturePhoto(); else void startCamera(); }}>{saving ? "Saving card…" : busy ? "Creating sample colors…" : artwork ? "Save this card" : cameraStatus === "starting" ? "Opening camera…" : cameraStatus !== "live" ? "Start camera" : front ? "Take back photo" : "Take front photo"}</button>
      {!artwork ? <button type="button" className={styles.cancel} disabled={busy || saving} onClick={() => { captureVersion.current++; stopCamera(); input.current?.click(); }}>Use phone camera / choose photo</button> : null}
      <button type="button" className={styles.cancel} disabled={saving} onClick={artwork || front ? () => { reset(); void startCamera(); } : close}>{artwork || front ? "Start again" : "Cancel"}</button>
      <p className={styles.note}>Saves this sample card to your wallet. No funds are added. No original photo or real card details are stored.</p>
    </dialog>
  </>;
}
