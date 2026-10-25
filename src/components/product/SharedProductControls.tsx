"use client";

import popupStyles from "@/components/layout/responsive-popup.module.css";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { recordReceivedProduct } from "@/lib/sharing/saved-share-actions";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { updateSharedProductReceiving } from "@/lib/sharing/receiving-actions";
import type { SharedProductContext } from "@/lib/sharing/receiving";
import { containDialogTab } from "@/components/account/dialog-keyboard";
import styles from "./shared-product-controls.module.css";
export function SharedProductControls({ slug, initial, signedIn, saveOnReturn = false }: { slug: string; initial: SharedProductContext | null; signedIn: boolean; saveOnReturn?: boolean }) {
  const [context, setContext] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [receive, setReceive] = useState(initial?.receiving ?? true);
  const [shareBack, setShareBack] = useState(initial?.shareBack ?? false);
  const [dialogKind, setDialogKind] = useState<"membership" | "options" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [savingItem, setSavingItem] = useState(false);
  const router = useRouter();
  const returnPath = `/items/${slug}${initial ? `?share=${initial.token}` : "?shared=1"}`;
  function signIn() { router.push(authNavigationHref("/signup", returnPath)); }
  useEffect(() => {
    if (!signedIn || initial?.own) return;
    let active = true;
    void recordReceivedProduct(slug, initial?.token ?? null, saveOnReturn).then(result => {
      if (!active) return;
      if (!result.ok) setMessage(result.message); else if (saveOnReturn) router.replace(result.href);
    }).catch(() => { if (active) setMessage("This share could not be saved yet. Please try Save again."); });
    return () => { active = false; };
  }, [slug, initial?.token, initial?.own, signedIn, saveOnReturn, router]);
  async function saveItem() {
    if (!signedIn) { router.push(authNavigationHref("/signup", `${returnPath}&saveShared=1`)); return; }
    if (savingItem) return;
    setSavingItem(true); setMessage("");
    try {
      const result = await recordReceivedProduct(slug, context?.token ?? null, true);
      if (result.ok) router.push(result.href); else setMessage(result.message);
    } catch { setMessage("This shared item could not be saved. Please try again."); }
    finally { setSavingItem(false); }
  }
  useEffect(() => {
    if (!signedIn || !initial || initial.own || initial.hasChoice) return;
    let alive = true;
    void updateSharedProductReceiving(initial.token, true, null, true).then(result => {
      if (!alive) return;
      if (result.context) { setContext(result.context); setReceive(result.context.receiving); setShareBack(result.context.shareBack); }
      else setMessage(result.message);
    }).catch(() => { if (alive) setMessage("Your receiving choice could not be loaded. Please try again."); });
    return () => { alive = false; };
  }, [initial, signedIn]);
  useEffect(() => {
    const element = dialog.current;
    if (!element || !dialogKind) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    return () => { element.close(); trigger?.focus({ preventScroll: true }); };
  }, [dialogKind]);
  async function save(receiving: boolean, sharing: boolean | null) {
    if (!context || busy) return;
    setBusy(true); setMessage("");
    try { const result = await updateSharedProductReceiving(context.token, receiving, sharing); setMessage(result.message); if (result.context) { setContext(result.context); setReceive(result.context.receiving); setShareBack(result.context.shareBack); setDialogKind(null); window.dispatchEvent(new Event("zero-loss-notifications-read")); } }
    catch { setMessage("Your choice could not be saved. Please try again."); }
    finally { setBusy(false); }
  }
  if (initial?.own) return null;
  const scope = context?.scope ?? "this Crew";
  return <section className={styles.controls} aria-label="Shared item options">
    {context ? <p>Shared by <strong>{context.sender}</strong>{context.demo ? " · Demo share" : context.isGroup ? ` · ${context.scope}` : ""}</p> : <p>A pick shared with you</p>}
    <div className={styles.buttons}>
      <button type="button" disabled={savingItem} onClick={() => void saveItem()}>{savingItem ? "Saving…" : "Save to Shared with You"}</button>
      <button type="button" disabled={busy} onClick={() => { if (!signedIn) signIn(); else if (context) setDialogKind("membership"); else setMessage("This older link doesn’t identify a Crew. Manage your memberships in Your Crew."); }}>{context?.receiving ? `Leave ${scope}` : `${context?.hasChoice ? "Rejoin" : "Join"} ${scope}`}</button>
      <button type="button" onClick={() => { if (!signedIn) signIn(); else { setReceive(context?.receiving ?? true); setShareBack(context?.shareBack ?? false); setDialogKind("options"); } }}>Sharing options</button>
    </div>
    {message && !dialogKind ? <p role="status" className={styles.status}>{message}</p> : null}
    <dialog ref={dialog} className={`${styles.dialog} ${popupStyles.dialog}`} onCancel={() => setDialogKind(null)} onKeyDown={containDialogTab} aria-labelledby="shared-choice-heading">
      <div className={styles.heading}><h2 id="shared-choice-heading">{dialogKind === "membership" ? `${context?.receiving ? "Leave" : "Rejoin"} ${scope}?` : "Sharing options"}</h2><button type="button" aria-label="Close sharing options" onClick={() => setDialogKind(null)}>×</button></div>
      {context?.demo ? <p>This demo saves your choices for this sample share only. It does not contact anyone or share your picks.</p> : null}
      {dialogKind === "membership" ? <><p>{context?.receiving ? "Stop receiving shares from this Crew or group. Items already sent to you stay in Shared with You, and you can rejoin from this link." : "Receive the picks they share with you again. This does not share your own picks."}</p><button className={styles.save} type="button" disabled={busy} onClick={() => void save(!context?.receiving, null)}>{busy ? "Saving…" : context?.receiving ? "Leave" : "Rejoin"}</button></> : context ? <>
        <label><input type="checkbox" checked={receive} onChange={e => setReceive(e.target.checked)} /><span>Receive shared picks from {scope}</span></label>
        <label><input type="checkbox" checked={shareBack} onChange={e => setShareBack(e.target.checked)} /><span>Let {context.sender} see picks I choose to share with my Crew</span></label>
        <p>Receiving is separate from sharing. Your private picks and wallet are never shared. Your existing audience settings still apply.</p>
        <button className={styles.save} type="button" disabled={busy} onClick={() => void save(receive, shareBack)}>{busy ? "Saving…" : "Save choices"}</button>
      </> : <p>This link has no Crew details. <Link href="/account/crew/display#account-settings-sections">Open your sharing preferences →</Link></p>}
      {message ? <p role="status">{message}</p> : null}
    </dialog>
  </section>;
}
