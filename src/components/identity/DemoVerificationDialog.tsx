"use client";

import { useEffect, useRef, useState } from "react";
import { beginDemoVerification, advanceDemoVerification } from "@/lib/identity/demo-verification-actions";
import type { DemoVerification, DemoVerificationStep } from "@/lib/identity/demo-verification";
import styles from "./demo-verification.module.css";

const stages = ["Welcome", "Details", "ID front", "ID back", "Headshot", "Review", "Result"];
const stageIndex: Record<DemoVerificationStep, number> = { start: 0, consent: 1, details: 2, document_front: 3, document_back: 4, selfie: 5, submitted: 6, demo_passed: 6, requires_input: 6 };

/** Deliberately illustrated, not a real person or government document. */
function SampleFace({ turn = 0 }: { turn?: number }) {
  return <svg viewBox="0 0 180 210" role="img" aria-label="Illustrated demo person" className={styles.face}>
    <path fill="#137d99" d="M12 210v-27c0-43 156-43 156 0v27Z" />
    <g style={{ transform: `translateX(${turn * 9}px) scaleX(${turn ? .87 : 1})`, transformOrigin: "90px 100px", transition: "transform .8s ease" }}>
      <path fill="#dba37e" d="M68 132h44v30c-15 18-31 18-44 0Z" />
      <ellipse fill="#e9b897" cx="90" cy="85" rx="47" ry="61" />
      <path fill="#25384b" d="M43 82C21 15 71 0 110 16c36 9 42 47 27 74l-6-38c-32 16-48 4-63-4L47 87Z" />
      <g fill="#22364b"><ellipse cx={72 + turn * 7} cy="86" rx="4" ry="5" /><ellipse cx={110 + turn * 7} cy="86" rx="4" ry="5" /></g>
      <path d={`M${90 + turn * 8} 91v15h7`} fill="none" stroke="#b6785b" strokeWidth="3" strokeLinecap="round" />
      <path d="M75 120q16 13 31 0" fill="none" stroke="#844e42" strokeWidth="3" strokeLinecap="round" />
    </g>
  </svg>;
}

function SampleId({ back = false }: { back?: boolean }) {
  return <div className={styles.idCard} aria-label={back ? "Back of fictional demo ID" : "Front of fictional demo ID"}>
    <div className={styles.idTop}><span>ZERO LOSS · SAMPLE ID</span><strong>DEMO — NOT VALID</strong></div>
    {back ? <div className={styles.idBack}>
      <strong>TRAINING DOCUMENT ONLY</strong>
      <p>This card is fictional. It is not government-issued and cannot be used as identification.</p>
      <div className={styles.notBarcode}>SAMPLE · NO SCANNABLE DATA</div>
      <p>Signature: Alex Sample · ID: DEMO-0000</p>
    </div> : <div className={styles.idFront}>
      <div className={styles.idPortrait}><SampleFace /></div>
      <div><small>NAME</small><strong>ALEX SAMPLE</strong><small>DATE OF BIRTH</small><span>January 1, 1990</span><small>ADDRESS</small><span>123 Demo Lane<br />Example City, FL 00000</span><small>DOCUMENT</small><span>DEMO-0000 · United States</span></div>
    </div>}
    <div className={styles.idBottom}>FICTIONAL SAMPLE · NOT A FLORIDA GOVERNMENT ID</div>
  </div>;
}

function SampleDetails() {
  return <div className={styles.fields}>
    {[["Full legal name", "Alex Sample"], ["Date of birth", "January 1, 1990"], ["Country", "United States"], ["Address", "123 Demo Lane, Example City, FL 00000"]].map(([label, value]) =>
      <label key={label}>{label}<input readOnly value={value} autoComplete="off" aria-label={`${label} — demo data`} /></label>)}
  </div>;
}

function HeadshotSample({ disabled, onUse }: { disabled: boolean; onUse: () => void }) {
  const [frame, setFrame] = useState(-1);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setFrame(current => Math.min(3, current + 1)), 1400);
    return () => window.clearInterval(timer);
  }, [playing]);
  useEffect(() => { if (frame === 3) { /* Stop the sample; never request a camera stream. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaying(false);
  } }, [frame]);
  const instruction = frame < 0 ? "Ready for your sample headshot" : ["Look straight ahead", "Slowly turn your head left", "Now turn your head right", "Sample recording complete"][frame];
  return <>
    <div className={styles.camera} aria-label="Simulated headshot video">
      <span className={styles.cameraBadge}>SAMPLE PLAYBACK · CAMERA OFF</span>
      <div className={styles.faceOval}><SampleFace turn={frame === 1 ? -1 : frame === 2 ? 1 : 0} /></div>
      <p role="status">{instruction}</p>
      <div className={styles.videoSteps} aria-hidden="true">{[0, 1, 2].map(n => <span key={n} data-complete={frame > n} />)}</div>
    </div>
    <p className={styles.hint}>A real provider may ask for a short video or selfie. This example plays an illustrated person; it does not film you or test liveness.</p>
    {frame === 3 ? <div className={styles.actions}><button type="button" disabled={disabled} className={styles.secondary} onClick={() => { setFrame(0); setPlaying(true); }}>Replay sample</button><button type="button" disabled={disabled} className={styles.primary} onClick={onUse}>Use sample recording</button></div>
      : <button type="button" className={styles.primary} disabled={disabled || playing} onClick={() => { setFrame(0); setPlaying(true); }}>{playing ? "Playing sample…" : "Play sample headshot"}</button>}
  </>;
}

export function DemoVerificationDialog({ rewardId, onClose, onComplete }: { rewardId: string; onClose: () => void; onComplete: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [verification, setVerification] = useState<DemoVerification | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);
  const step = verification?.step;

  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    beginDemoVerification(rewardId).then(result => {
      if (!active) return;
      if (result.verification) setVerification(result.verification); else setError(result.error);
      setBusy(false);
    });
    return () => { active = false; };
  }, [rewardId]);
  useEffect(() => { if (step) heading.current?.focus(); }, [step]);

  async function advance(next: DemoVerificationStep) {
    if (!verification || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    const result = await advanceDemoVerification(verification.id, next);
    if (result.verification) setVerification(result.verification); else setError(result.error);
    setBusy(false); inFlight.current = false;
  }
  async function restart() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    const result = await beginDemoVerification(rewardId);
    if (result.verification) { setVerification(result.verification); setConsent(false); } else setError(result.error);
    setBusy(false); inFlight.current = false;
  }
  const titles: Record<DemoVerificationStep, string> = { start: "Confirm your identity", consent: "Review your details", details: "Photograph the front of your ID", document_front: "Now, the back of your ID", document_back: "Record a short headshot video", selfie: "Review before submitting", submitted: "Ready for the demo check", demo_passed: "Demo identity check complete", requires_input: "Let’s try that photo again" };

  return <dialog ref={dialog} aria-labelledby="identity-demo-title" className={styles.dialog} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className={styles.header}><span className={styles.demoBadge}>DEMO DATA · NO PERSONAL DATA COLLECTED</span><button type="button" className={styles.close} aria-label="Save progress and close identity check" disabled={busy} onClick={onClose}>×</button></header>
    <div className={styles.body}>
      <p className={styles.eyebrow}>PRIZE CLAIM · IDENTITY CHECK</p>
      <h2 ref={heading} tabIndex={-1} id="identity-demo-title">{step ? titles[step] : "Opening your saved check…"}</h2>
      {step ? <nav aria-label="Verification progress"><p className={styles.mobileProgress}>Step {stageIndex[step] + 1} of 7 · {stages[stageIndex[step]]}</p><ol className={styles.progress}>{stages.map((label, index) => <li key={label} aria-current={stageIndex[step] === index ? "step" : undefined} data-complete={index < stageIndex[step]}><span>{index < stageIndex[step] ? "✓" : index + 1}</span>{label}</li>)}</ol></nav> : null}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {!step && !busy ? <button type="button" className={styles.primary} onClick={restart}>Retry opening check</button> : null}
      {step === "start" ? <>
        <p className={styles.copy}>Before claiming a first prize, this walkthrough shows how an identity check could work. In a live service, the required checks depend on the approved provider and eligibility rules.</p>
        <div className={styles.notice}><strong>Try the complete experience—using a sample person.</strong><p>We supply every photo and detail. Do not upload an ID, enter a Social Security number, or turn on your camera. No actual identity verification takes place.</p></div>
        <ul className={styles.checklist}><li>Review sample identity details</li><li>Capture the sample ID, front and back</li><li>Play a sample head-turn video</li><li>Finish the demo check and return to your prize</li></ul>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} />I understand this walkthrough uses only fictional demo data.</label>
        <button type="button" className={styles.primary} disabled={!consent || busy} onClick={() => advance("consent")}>Start demo check</button>
      </> : null}
      {step === "consent" ? <><p className={styles.copy}>These fields are automatically filled with our sample person—not your account details.</p><SampleDetails /><p className={styles.hint}>Read-only demo data. No identity details are submitted with this step.</p><button type="button" className={styles.primary} disabled={busy} onClick={() => advance("details")}>Confirm sample details</button></> : null}
      {step === "details" || step === "document_front" ? <>
        <p className={styles.copy}>Keep all four corners visible and avoid glare. For this walkthrough, the sample card is already positioned for you.</p>
        <div className={styles.capture}><span className={styles.cameraBadge}>DEMO CAPTURE · CAMERA OFF</span><SampleId back={step === "document_front"} /></div>
        <p className={styles.hint}>A fictional Florida-address sample, not a reproduction of a government ID. No upload or camera permission is needed.</p>
        <button type="button" className={styles.primary} disabled={busy} onClick={() => advance(step === "details" ? "document_front" : "document_back")}>Capture sample {step === "details" ? "front" : "back"}</button>
      </> : null}
      {step === "document_back" ? <HeadshotSample disabled={busy} onUse={() => advance("selfie")} /> : null}
      {step === "selfie" ? <>
        <SampleDetails /><ul className={styles.checklist}><li>Sample ID front captured</li><li>Sample ID back captured</li><li>Sample headshot recording selected</li></ul>
        <details className={styles.tax}><summary>What about Social Security numbers and taxes?</summary><p>Tax paperwork is separate from identity verification. This preview does not collect or submit a tax form.</p><label>Tax-number format example · not submitted<input readOnly value="XXX-XX-0000 — DEMO ONLY" aria-label="Tax-number example — demo only" /></label><p>Real tax information would only be requested when required, through an approved secure process.</p></details>
        <button type="button" className={styles.primary} disabled={busy} onClick={() => advance("submitted")}>Submit sample for review</button>
      </> : null}
      {step === "submitted" ? <>
        <div className={styles.notice}><strong>Sample submitted</strong><p>Your progress is saved. Run a simulated result below; no real document or face analysis is performed.</p></div>
        <button type="button" className={styles.primary} disabled={busy} onClick={() => advance("demo_passed")}>{busy ? "Saving demo result…" : "Run successful demo check"}</button>
        <button type="button" className={styles.textButton} disabled={busy} onClick={() => advance("requires_input")}>Try the “photo needs retaking” example</button>
      </> : null}
      {step === "requires_input" ? <><div className={styles.notice}><strong>Sample outcome: photo not clear enough.</strong><p>In a real check, you could be asked to retake a photo. Your prize has not been claimed. This failed demo attempt remains in the audit history.</p></div><button type="button" className={styles.primary} disabled={busy} onClick={restart}>Try again with sample ID</button></> : null}
      {step === "demo_passed" ? <><div className={styles.success}><span aria-hidden="true">✓</span><strong>Demo check passed</strong><p>Saved to your account. You can now continue claiming this demo prize. This is not real KYC approval.</p></div><p className={styles.hint}>Later demo wins can use this saved result under the same demo policy. Live verification may need to be repeated.</p><button type="button" className={styles.primary} disabled={busy} onClick={onComplete}>Continue to claim prize</button></> : null}
      {busy ? <p role="status" className={styles.saving}>Saving securely…</p> : null}
      {verification ? <p className={styles.reference}>Demo session {verification.reference}</p> : null}
    </div>
    <footer className={styles.footer}><span>Progress is saved to your account.</span><button type="button" disabled={busy} onClick={onClose}>Finish later</button></footer>
  </dialog>;
}
