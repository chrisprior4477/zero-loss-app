"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveSupportCase, type SupportActionState } from "@/lib/support/actions";
import styles from "@/components/help/help-tickets.module.css";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/account/notification-events";
import type { SupportOrderContext } from "@/lib/support/order-context";

const field = `${styles.ticket} ${styles.field}`;
export function SupportForm({ requestKey, caseId, transactionId, order, staff = false }: { requestKey: string; caseId?: string; transactionId?: string; order?: SupportOrderContext; staff?: boolean }) {
  const router = useRouter();
  const [stableKey] = useState(requestKey);
  const attempted = useRef<FormData | null>(null);
  const [subject, setSubject] = useState(order ? `Question about ${order.title}`.slice(0, 140) : transactionId ? "Question about this wallet transaction" : "");
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState(async (previous: SupportActionState, data: FormData): Promise<SupportActionState> => {
    const payload = previous.status === "error" && previous.uncertain && attempted.current ? attempted.current : data;
    attempted.current = payload;
    try { return await saveSupportCase(previous, payload); }
    catch { return { status: "error", uncertain: true, message: "Connection interrupted. Your text is still here. Check the saved result below without creating a second request." }; }
  }, { status: "idle" });
  const uncertain = state.status === "error" && state.uncertain;
  const locked = pending || uncertain;
  useEffect(() => {
    if (state.status === "saved") { window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT)); router.replace(`/support?case=${state.caseId}#conversation`); router.refresh(); }
  }, [state, router]);
  if (state.status === "saved") return <div role="status" className={`${styles.ticket} ${styles.note}`}>Your message is saved. <Link className="font-bold underline" href={`/support?case=${state.caseId}#conversation`}>View your case →</Link></div>;
  return <form action={action} className="space-y-4">
    <input type="hidden" name="requestKey" value={stableKey} />
    <input type="hidden" name="caseId" value={caseId ?? ""} />
    <input type="hidden" name="transactionId" value={transactionId ?? ""} />
    <input type="hidden" name="rewardId" value={order?.rewardId ?? ""} />
    {!caseId ? <>
      <label className="block font-bold">What do you need help with?<span className={field}><select name="category" defaultValue={order ? "reward" : transactionId ? "wallet" : "other"} disabled={locked}>
        <option value="wallet">Wallet or funding</option><option value="entry">An entry</option><option value="reward">A prize or gift card</option><option value="account">My account</option><option value="other">Something else</option>
      </select></span></label>
      <label className="block font-bold">Subject<span className={field}><input name="subject" required minLength={5} maxLength={140} value={subject} onChange={event => setSubject(event.target.value)} disabled={locked} /></span></label>
    </> : null}
    <label className="block font-bold">{caseId ? "Your reply" : "Tell us what happened"}<span className={field}><textarea name="body" required minLength={10} maxLength={order ? 3800 : 4000} rows={5} value={body} onChange={event => setBody(event.target.value)} aria-describedby="support-privacy" disabled={locked} /></span></label>
    <p id="support-privacy" className="text-sm leading-6 opacity-75">Please do not include passwords, full card numbers, gift-card codes, Social Security numbers, or ID documents. {order ? "The selected order reference is already attached." : transactionId ? "The selected transaction is already attached." : "Describe the issue and what you expected to happen."}</p>
    {staff ? <label className="block font-bold">Case status<span className={field}><select name="status" defaultValue="awaiting_customer" disabled={locked}>
      <option value="open">Open — still investigating</option><option value="awaiting_customer">Waiting for customer</option><option value="resolved">Resolved</option>
    </select></span></label> : <input type="hidden" name="status" value="open" />}
    {state.status === "error" ? <p role="alert" className={`${styles.ticket} ${styles.note} ${styles.error} text-sm`}>{state.message}</p> : null}
    <button type="submit" disabled={pending} className={`${styles.ticket} ${styles.button} ${styles.primary} w-full`}>{pending ? "Saving…" : uncertain ? "Check saved message" : caseId ? "Send reply" : "Send support request"}</button>
    <p className="text-xs leading-5 opacity-70">Replies and status updates appear here and in Notifications. Submitting a case does not move funds or approve a refund.</p>
  </form>;
}
