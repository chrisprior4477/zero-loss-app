"use client";

import { startTransition, useActionState, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveSupportCase, type SupportActionState } from "@/lib/support/actions";
import styles from "@/components/help/help-tickets.module.css";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/account/notification-events";
import { supportMessageLimit } from "@/lib/support/reward-reference";
import { readSupportDraft, supportDraftKey, writeSupportDraft, type SupportDraft } from "@/lib/support/draft";

const field = `${styles.ticket} ${styles.field}`;
type Props = { ownerId?: string; requestKey: string; caseId?: string; transactionId?: string; rewardId?: string; staff?: boolean };
export function SupportForm(props: Props) {
  return <SupportFormSession key={`${props.ownerId}:${props.caseId}:${props.transactionId}:${props.rewardId}:${props.staff}`} {...props} />;
}

function SupportFormSession({ ownerId, requestKey, caseId, transactionId, rewardId, staff = false }: Props) {
  const router = useRouter();
  const initialDraft = (): SupportDraft => ({ requestKey, subject: transactionId ? "Question about this wallet transaction" : rewardId ? "Question about this reward" : "", body: "", category: transactionId ? "wallet" : rewardId ? "reward" : "other", caseStatus: "awaiting_customer", uncertain: false });
  const [draft, setDraft] = useState(initialDraft);
  const { subject, body, category, caseStatus } = draft;
  const draftKey = supportDraftKey(ownerId, caseId ? `reply:${caseId}:${staff}` : transactionId ? `transaction:${transactionId}` : rewardId ? `reward:${rewardId}` : "new");
  const attempted = useRef<FormData | null>(null);
  const restored = useRef(false);
  useLayoutEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = readSupportDraft(draftKey);
    if (saved) {
      // Restore after hydration, scoped to this account and support reference.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(saved);
      if (saved.uncertain) {
        const payload = new FormData();
        Object.entries({ requestKey: saved.requestKey, caseId: caseId ?? "", transactionId: transactionId ?? "", rewardId: rewardId ?? "", subject: saved.subject, body: saved.body, category: saved.category, status: staff ? saved.caseStatus : "open" }).forEach(([name, value]) => payload.set(name, value));
        attempted.current = payload;
      }
    }
  }, [draftKey, caseId, transactionId, rewardId, staff]);
  function changeDraft(change: Partial<SupportDraft>) {
    const next = { ...draft, ...change };
    setDraft(next);
    const initial = initialDraft();
    writeSupportDraft(draftKey, next.body || next.subject !== initial.subject || next.category !== initial.category || next.caseStatus !== initial.caseStatus || next.uncertain ? next : null);
  }
  const [state, action, pending] = useActionState(async (previous: SupportActionState, data: FormData): Promise<SupportActionState> => {
    const payload = ((previous.status === "error" && previous.uncertain) || draft.uncertain) && attempted.current ? attempted.current : data;
    attempted.current = payload;
    changeDraft({ uncertain: true });
    try {
      const result = await saveSupportCase(previous, payload);
      if (result.status === "saved") writeSupportDraft(draftKey, null);
      else changeDraft({ uncertain: result.status === "error" && Boolean(result.uncertain) });
      return result;
    }
    catch { return { status: "error", uncertain: true, message: "Connection interrupted. Your text is still here. Check the saved result below without creating a second request." }; }
  }, { status: "idle" });
  const uncertain = draft.uncertain || (state.status === "error" && state.uncertain);
  const locked = pending || uncertain;
  useEffect(() => {
    if (state.status === "saved") { window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT)); router.replace(`/support?case=${state.caseId}#conversation`); router.refresh(); }
  }, [state, router]);
  if (state.status === "saved") return <div role="status" className={`${styles.ticket} ${styles.note}`}>Your message is saved. <Link className="font-bold underline" href={`/support?case=${state.caseId}#conversation`}>View your case →</Link></div>;
  return <form onSubmit={event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }} className="space-y-4">
    <input type="hidden" name="requestKey" value={draft.requestKey} />
    <input type="hidden" name="caseId" value={caseId ?? ""} />
    <input type="hidden" name="transactionId" value={transactionId ?? ""} />
    <input type="hidden" name="rewardId" value={rewardId ?? ""} />
    {!caseId ? <>
      <label className="block font-bold">What do you need help with?<span className={field}><select name="category" value={category} onChange={event => changeDraft({ category: event.target.value })} disabled={locked}>
        <option value="wallet">Wallet or funding</option><option value="entry">An entry</option><option value="reward">A prize or gift card</option><option value="account">My account</option><option value="other">Something else</option>
      </select></span></label>
      <label className="block font-bold">Subject<span className={field}><input name="subject" required minLength={5} maxLength={140} value={subject} onChange={event => changeDraft({ subject: event.target.value })} aria-invalid={state.status === "error" && state.field === "subject" || undefined} aria-describedby={state.status === "error" && state.field === "subject" ? "support-error" : undefined} disabled={locked} /></span></label>
    </> : null}
    <label className="block font-bold">{caseId ? "Your reply" : "Tell us what happened"}<span className={field}><textarea name="body" required minLength={10} maxLength={supportMessageLimit(rewardId)} rows={5} value={body} onChange={event => changeDraft({ body: event.target.value })} aria-invalid={state.status === "error" && state.field === "body" || undefined} aria-describedby={state.status === "error" && state.field === "body" ? "support-privacy support-error" : "support-privacy"} disabled={locked} /></span></label>
    <p id="support-privacy" className="text-sm leading-6 opacity-75">Please do not include passwords, full card numbers, gift-card codes, Social Security numbers, or ID documents. {transactionId ? "The selected transaction is already attached." : rewardId ? "The selected reward reference is already attached." : "Describe the issue and what you expected to happen."}</p>
    {staff ? <label className="block font-bold">Case status<span className={field}><select name="status" value={caseStatus} onChange={event => changeDraft({ caseStatus: event.target.value })} disabled={locked}>
      <option value="open">Open — still investigating</option><option value="awaiting_customer">Waiting for customer</option><option value="resolved">Resolved</option>
    </select></span></label> : <input type="hidden" name="status" value="open" />}
    {state.status === "error" ? <p id="support-error" role="alert" className={`${styles.ticket} ${styles.note} ${styles.error} text-sm`}>{state.message}</p> : null}
    {draft.uncertain && state.status === "idle" ? <p role="alert" className={`${styles.ticket} ${styles.note} ${styles.error} text-sm`}>Your previous message may already be saved. Check its saved result before sending another request.</p> : null}
    <button type="submit" disabled={pending} className={`${styles.ticket} ${styles.button} ${styles.primary} w-full`}>{pending ? "Saving…" : uncertain ? "Check saved message" : caseId ? "Send reply" : "Send support request"}</button>
    {body || subject !== initialDraft().subject ? <button type="button" disabled={locked} className="min-h-11 text-sm font-bold underline disabled:opacity-50" onClick={() => { setDraft(initialDraft()); attempted.current = null; writeSupportDraft(draftKey, null); }}>Clear draft</button> : null}
    <p className="text-xs leading-5 opacity-70">Replies and status updates appear here and in Notifications. Submitting a case does not move funds or approve a refund.</p>
  </form>;
}
