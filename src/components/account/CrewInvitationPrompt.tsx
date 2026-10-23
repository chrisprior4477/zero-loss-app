"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { respondToCrewRequest } from "@/lib/crew/actions";
import { containDialogTab } from "./dialog-keyboard";
import styles from "@/components/product/post-entry-crew-toast.module.css";

export type CrewInvitationPromptData = { id: string; name: string; status: "pending" | "accepted" | "declined" | "removed" };

/** The server supplies only invitations addressed to the signed-in recipient. */
export function CrewInvitationPrompt({ invitation, unavailable = false }: { invitation: CrewInvitationPromptData | null; unavailable?: boolean }) {
  const router = useRouter();
  // Preserve the decision/success screen when the action revalidates this page.
  const [request] = useState(invitation);
  const [open, setOpen] = useState(Boolean(invitation) || unavailable);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = "hidden"; heading.current?.focus();
    return () => { element.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus({ preventScroll: true }); };
  }, [open]);
  function close() { if (pending.current) return; setOpen(false); if (result?.ok) router.refresh(); }
  async function respond(accept: boolean) {
    if (!request || pending.current) return;
    pending.current = true; setBusy(true); setResult(null);
    try { setResult(await respondToCrewRequest(request.id, accept)); }
    catch { setResult({ ok: false, message: "We couldn’t confirm your response. Please try again or review your Crew requests." }); }
    finally { pending.current = false; setBusy(false); }
  }
  if (!open) return null;
  const canRespond = request?.status === "pending" && !result?.ok;
  return <dialog ref={dialog} className={styles.toast} aria-labelledby={`${id}-title`} onKeyDown={containDialogTab} onCancel={event => { event.preventDefault(); close(); }}>
    <div className={styles.paper}>
      <div className={styles.top}><p className={styles.eyebrow}>PRIVATE CREW INVITATION</p><button type="button" className={styles.close} aria-label="Close Crew invitation" onClick={close} disabled={busy}>×</button></div>
      <h2 ref={heading} tabIndex={-1} id={`${id}-title`}>{result?.ok ? "Crew request updated" : request?.status === "pending" ? `Join ${request.name}’s Crew?` : request?.status === "accepted" ? "You’re already connected" : "Review your Crew invitation"}</h2>
      {canRespond ? <>
        <p className={styles.messagePreview}>{request.name} invited you to connect on Zero Loss. Your past entries, wallet, and payment details won’t be shared.</p>
        <button type="button" className={styles.primary} disabled={busy} onClick={() => void respond(true)}>{busy ? "Saving…" : "Join Crew"}</button>
        <button type="button" disabled={busy} onClick={() => void respond(false)}>Decline invitation</button>
      </> : !result?.ok ? <p className={styles.note}>{request?.status === "accepted" ? `You and ${request.name} are already in each other’s Crew.` : "This invitation isn’t available for this account. Sign in with the account that received the email, or check your Crew requests."}</p> : null}
      {result ? <p role={result.ok ? "status" : "alert"} className={`${styles.feedback} ${result.ok ? "" : styles.error}`}>{result.message}</p> : null}
      <button type="button" className={styles.later} onClick={close} disabled={busy}>{result?.ok || !canRespond ? "Done" : "Not now"}</button>
      <Link className={styles.manage} href="/account/crew?tab=requests" onClick={event => { if (busy) event.preventDefault(); else close(); }}>View all Crew requests →</Link>
      <p className={styles.privacy}>Only picks you choose to share become visible to your Crew.</p>
    </div>
  </dialog>;
}
