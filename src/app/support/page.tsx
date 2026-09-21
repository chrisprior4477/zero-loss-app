import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { PageContainer } from "@/components/layout/PageContainer";
import { SupportForm } from "@/components/support/SupportForm";
import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/account/context";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { formatUsdFromCents } from "@/lib/wallet/money";

export const metadata: Metadata = { title: "Support" };
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const card = "rounded-2xl border border-cyan-300/35 bg-[#001b3d] p-5 sm:p-7";
const statusLabels: Record<string, string> = { open: "Open — awaiting review", awaiting_customer: "Waiting for your reply", resolved: "Resolved" };
const pageSize = 50;
function pageIndex(value: unknown) {
  return typeof value === "string" && /^\d{1,5}$/.test(value) ? Math.max(0, Number(value) - 1) : 0;
}
function statusLabel(status: string, staffView = false) {
  return staffView && status === "awaiting_customer" ? "Waiting for customer" : statusLabels[status] ?? "Status unavailable";
}
function pageLinks(base: string, page: number, more: boolean, conversation = false) {
  const parameter = conversation ? "messages" : "page";
  const href = (index: number) => `${base}${base.includes("?") ? "&" : "?"}${parameter}=${index + 1}${conversation ? "#conversation" : "#case-list"}`;
  return <nav aria-label={conversation ? "Conversation pages" : "Case pages"} className="my-4 flex flex-wrap items-center gap-5 text-sm font-bold text-cyan-300">
    {page > 0 ? <Link href={href(page - 1)}>← Newer {conversation ? "messages" : "cases"}</Link> : null}
    <span className="text-white/60">Page {page + 1}</span>
    {more ? <Link href={href(page + 1)}>Older {conversation ? "messages" : "cases"} →</Link> : null}
  </nav>;
}
function transactionLabel(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (typeof r.amount !== "number" || !Number.isSafeInteger(r.amount) || typeof r.created_at !== "string" || !Number.isFinite(Date.parse(r.created_at))) return null;
  return `${r.amount > 0 ? "+" : ""}${formatUsdFromCents(r.amount)} · ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(r.created_at))} UTC`;
}

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ case?: string; transaction?: string; view?: string; page?: string; messages?: string }> }) {
  const query = await searchParams;
  const account = await getAccountContext();
  const validCase = typeof query.case === "string" && uuid.test(query.case) ? query.case : null;
  const validTransaction = typeof query.transaction === "string" && uuid.test(query.transaction) ? query.transaction : null;
  const next = validCase ? `/support?case=${validCase}` : validTransaction ? `/support?transaction=${validTransaction}` : "/support";
  const heading = <header className="mb-7"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-cyan-300">Here to help</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Support</h1><p className="mt-3 text-white/70">Tell us what happened. Keep the conversation and its status in one place.</p></header>;
  if (!account) return <PageContainer>{heading}<div className={card}><p>Sign in to report a problem or view your private support cases.</p><Link href={`/login?next=${encodeURIComponent(next)}`} className="mt-4 inline-block rounded-xl bg-[#00b9ff] px-5 py-3 font-bold text-[#00132e]">Sign in to get help</Link></div></PageContainer>;
  if (!isPreviewDataEnvironment()) return <PageContainer>{heading}<p role="status">Support submission is unavailable in this environment.</p></PageContainer>;
  const db = await createClient();
  const access = await db.rpc("has_support_access");
  const staff = access.data === true;
  const inbox = query.view === "inbox" && staff;
  const navigation = <nav className="mb-6 flex flex-wrap gap-4 text-sm font-bold text-cyan-300"><Link href="/support">My support cases</Link><Link href="/account/wallet?view=history">Wallet history</Link>{staff ? <Link href="/support?view=inbox">Private support inbox</Link> : null}</nav>;
  if ((query.case && !validCase) || (query.transaction && !validTransaction) || (query.view === "inbox" && !staff)) return <PageContainer>{heading}{navigation}<p role="alert">That support view is not available for your account.</p></PageContainer>;
  if (validCase) {
    const result = await db.from("support_cases").select("id,case_number,subject,status,customer_id,ledger_entry_id").eq("id", validCase).maybeSingle();
    if (result.error || !result.data) return <PageContainer>{heading}{navigation}<p role="alert">This case is unavailable for your account. Return to My support cases to try again.</p></PageContainer>;
    const supportCase = result.data;
    const messagePage = pageIndex(query.messages);
    const events = await db.from("support_case_events").select("id,actor_kind,body,status,created_at").eq("case_id", validCase).order("created_at", { ascending: false }).order("id", { ascending: false }).range(messagePage * pageSize, (messagePage + 1) * pageSize);
    const messages = (events.data ?? []).slice(0, pageSize).reverse();
    const staffView = staff && supportCase.customer_id !== account.userId;
    const transaction = supportCase.ledger_entry_id ? await db.rpc("get_support_case_transaction", { p_case_id: validCase }) : null;
    return <PageContainer>{heading}{navigation}<section id="conversation" className={`${card} scroll-mt-36`}>
      <p className="break-all text-xs font-bold uppercase tracking-wide text-cyan-300">Case {supportCase.case_number}</p>
      <h2 className="mt-3 break-words text-2xl font-black">{supportCase.subject}</h2><p className="mt-2 font-bold text-[#67ff42]">{statusLabel(supportCase.status, staffView)}</p>
      {transactionLabel(transaction?.data) ? <p className="mt-3 rounded-xl border border-cyan-300/25 p-3 text-sm">Linked wallet transaction: {transactionLabel(transaction?.data)}</p> : null}
      <p className="mt-3 text-sm text-white/65">Check this case for the next reply. If more information is needed, you can add it below. No email is sent by this preview.</p>
      {events.error ? <p role="alert" className="mt-5">We couldn’t load the conversation. Refresh to try again.</p> : <ol className="my-6 space-y-4">{messages.map(event => <li key={event.id} className={`rounded-xl border p-4 ${event.actor_kind === "staff" ? "border-cyan-300/40 bg-[#0c3154]" : "border-white/15 bg-white/5"}`}>
        <p className="text-xs font-bold text-cyan-200">{event.actor_kind === "staff" ? "Zero Loss support" : "Customer"} · {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(event.created_at))} UTC</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{event.body}</p>
      </li>)}</ol>}
      {!events.error ? pageLinks(`/support?case=${validCase}`, messagePage, (events.data?.length ?? 0) > pageSize, true) : null}
      {messagePage === 0 ? <SupportForm key={`${validCase}-${events.data?.[0]?.id ?? "new"}`} requestKey={randomUUID()} caseId={validCase} staff={staffView} /> : <Link className="font-bold text-cyan-300 underline" href={`/support?case=${validCase}#conversation`}>Return to the latest messages to reply</Link>}
    </section></PageContainer>;
  }
  const transaction = validTransaction ? await db.from("ledger_entries").select("id,amount,created_at").eq("id", validTransaction).eq("customer_id", account.userId).eq("wallet_scope", "demo").maybeSingle() : null;
  const casePage = pageIndex(query.page);
  let casesQuery = db.from("support_cases").select("id,case_number,subject,status,updated_at").order("updated_at", { ascending: false }).order("id", { ascending: false }).range(casePage * pageSize, (casePage + 1) * pageSize);
  if (!inbox) casesQuery = casesQuery.eq("customer_id", account.userId);
  const cases = await casesQuery;
  return <PageContainer>{heading}{navigation}{inbox ? <p className="mb-5 rounded-xl border border-cyan-300/30 p-4 text-sm">Private case review and replies only. This inbox cannot issue refunds, adjust balances, or change prizes.</p> : null}
    <div className="grid gap-6 lg:grid-cols-2">
      {!inbox ? <section className={card}><h2 className="mb-4 text-xl font-black">Report a problem</h2>
        {validTransaction && (!transaction?.data || transaction.error) ? <p role="alert">That transaction is unavailable for your account. Return to Wallet history and select your transaction again.</p> : <>
          {transactionLabel(transaction?.data) ? <p className="mb-4 rounded-xl border border-cyan-300/30 p-3 text-sm">Linked wallet transaction: {transactionLabel(transaction?.data)}</p> : null}
          <SupportForm key={validTransaction ?? "new-case"} requestKey={randomUUID()} transactionId={validTransaction ?? undefined} />
        </>}
      </section> : null}
      <section id="case-list" className={`${card} scroll-mt-36 ${inbox ? "lg:col-span-2" : ""}`}><h2 className="text-xl font-black">{inbox ? "Support inbox" : "Your support cases"}</h2>
        {cases.error ? <p role="alert" className="mt-4">We couldn’t load cases. Please refresh to try again.</p> : !cases.data?.length ? <p className="mt-4 text-white/65">{casePage > 0 ? "No more cases on this page." : "No cases yet."}</p> : <ul className="mt-4 space-y-3">{cases.data.slice(0, pageSize).map(c => <li key={c.id}><Link href={`/support?case=${c.id}#conversation`} className="block rounded-xl border border-cyan-300/25 p-4 hover:bg-white/5"><strong className="block break-words">{c.subject}</strong><span className="mt-1 block text-sm text-cyan-200">{statusLabel(c.status, inbox)}</span><span className="mt-2 block break-all text-xs text-white/50">{c.case_number}</span></Link></li>)}</ul>}
        {!cases.error ? pageLinks(inbox ? "/support?view=inbox" : validTransaction ? `/support?transaction=${validTransaction}` : "/support", casePage, (cases.data?.length ?? 0) > pageSize) : null}
      </section>
    </div>
  </PageContainer>;
}
