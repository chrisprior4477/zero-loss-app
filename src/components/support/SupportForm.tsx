"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveSupportCase, type SupportActionState } from "@/lib/support/actions";

const input = "mt-2 min-h-12 w-full rounded-xl border border-cyan-300/35 bg-[#00142d] p-3 text-white focus:outline-2 focus:outline-cyan-300";
export function SupportForm({ requestKey, caseId, transactionId, staff = false }: { requestKey: string; caseId?: string; transactionId?: string; staff?: boolean }) {
  const router = useRouter();
  const [stableKey] = useState(requestKey);
  const attempted = useRef<FormData | null>(null);
  const [subject, setSubject] = useState(transactionId ? "Question about this wallet transaction" : "");
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
    if (state.status === "saved") { router.replace(`/support?case=${state.caseId}#conversation`); router.refresh(); }
  }, [state, router]);
  if (state.status === "saved") return <div role="status" className="rounded-xl border border-[#67ff42]/50 bg-[#123d32] p-4">Your message is saved. <Link className="font-bold text-cyan-300 underline" href={`/support?case=${state.caseId}#conversation`}>View your case →</Link></div>;
  return <form action={action} className="space-y-4">
    <input type="hidden" name="requestKey" value={stableKey} />
    <input type="hidden" name="caseId" value={caseId ?? ""} />
    <input type="hidden" name="transactionId" value={transactionId ?? ""} />
    {!caseId ? <>
      <label className="block font-bold">What do you need help with?<select name="category" defaultValue={transactionId ? "wallet" : "other"} className={input} disabled={locked}>
        <option value="wallet">Wallet or funding</option><option value="entry">An entry</option><option value="reward">A prize or gift card</option><option value="account">My account</option><option value="other">Something else</option>
      </select></label>
      <label className="block font-bold">Subject<input name="subject" required minLength={5} maxLength={140} value={subject} onChange={event => setSubject(event.target.value)} className={input} disabled={locked} /></label>
    </> : null}
    <label className="block font-bold">{caseId ? "Your reply" : "Tell us what happened"}<textarea name="body" required minLength={10} maxLength={4000} rows={5} value={body} onChange={event => setBody(event.target.value)} aria-describedby="support-privacy" className={input} disabled={locked} /></label>
    <p id="support-privacy" className="text-sm leading-6 text-white/65">Please do not include passwords, full card numbers, gift-card codes, Social Security numbers, or ID documents. {transactionId ? "The selected transaction is already attached." : "Describe the issue and what you expected to happen."}</p>
    {staff ? <label className="block font-bold">Case status<select name="status" defaultValue="awaiting_customer" className={input} disabled={locked}>
      <option value="open">Open — still investigating</option><option value="awaiting_customer">Waiting for customer</option><option value="resolved">Resolved</option>
    </select></label> : <input type="hidden" name="status" value="open" />}
    {state.status === "error" ? <p role="alert" className="rounded-xl border border-orange-300/50 bg-[#33232c] p-4 text-sm">{state.message}</p> : null}
    <button type="submit" disabled={pending} className="min-h-12 w-full rounded-xl bg-[#00b9ff] px-5 py-3 font-extrabold text-[#00132e] hover:bg-cyan-200 disabled:opacity-60">{pending ? "Saving…" : uncertain ? "Check saved message" : caseId ? "Send reply" : "Send support request"}</button>
    <p className="text-xs leading-5 text-white/60">Replies and status updates appear here and in Notifications. Submitting a case does not move funds or approve a refund.</p>
  </form>;
}
