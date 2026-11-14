import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { PageContainer } from "@/components/layout/PageContainer";
import { SupportForm } from "@/components/support/SupportForm";
import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/account/context";
import { exactOrderHref, fulfillmentFilter, fulfillmentHref } from "@/lib/account/fulfillment";
import { walletTransactionsHref, type RewardStatus } from "@/lib/account/activity";
import { walletSupportReturnHref } from "@/lib/wallet/ledger-return";
import { getSupportOrder } from "@/lib/account/order-support";
import type { AccountOrderStatus } from "@/lib/account/orders";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { formatOfferDeadline, safeTimeZone } from "@/lib/account/timezone";
import { accountPageReturnPath } from "@/lib/auth/account-return";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { DemoPaymentProvider, type DemoFundingRequest } from "@/lib/payments/demo-provider";
import { depositRequestKeyPattern } from "@/lib/payments/provider";
import { depositRecoveryHref } from "@/lib/wallet/funding-navigation";
import { depositSupportHref } from "@/lib/support/references";
import { ledgerEntryProduct } from "@/lib/wallet/history";
import { ledgerDescription } from "@/lib/wallet/transaction-links";
import { HelpShortcuts } from "@/components/help/HelpShortcuts";
import { HelpLandingScroll } from "@/components/help/HelpLandingScroll";
import styles from "@/components/help/help-tickets.module.css";

export const metadata: Metadata = { title: "Support" };
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const card = `${styles.ticket} ${styles.panel}`;
const button = `${styles.ticket} ${styles.button}`;
const note = `${styles.ticket} ${styles.note}`;
const awaitingCustomer = "awaiting_customer";
const statusLabels: Record<string, string> = { open: "Open — awaiting review", [awaitingCustomer]: "Waiting for your reply", resolved: "Resolved" };
const orderStatuses: Record<AccountOrderStatus, string> = {
  payment_confirmed: "Payment confirmed", issuance_pending: "Issuance pending", fulfilled: "Card issued",
  exception: "Action needed", cancelled: "Cancelled", corrected: "Order corrected",
};
const rewardStatuses: Record<Exclude<RewardStatus, "ready">, string> = {
  redeemed: "Used", expired: "Expired", cancelled: "Cancelled", issuance_pending: "Being issued", issuance_failed: "Needs attention",
};
const depositStatuses: Record<DemoFundingRequest["reconciliation"], string> = {
  reconciled: "Payment & credit matched", credit_pending: "Payment received · credit pending",
  not_processed: "Request saved · not processed", discrepancy: "Needs review",
};
const pageSize = 50;
const caseColumns = "id,case_number,subject,status";
type SupportCaseListItem = { id: string; case_number: string; subject: string; status: string };
type WaitingCase = SupportCaseListItem & { latest_reply?: { created_at: string }[] };
function pageIndex(value: unknown) {
  return typeof value === "string" && /^\d{1,5}$/.test(value) ? Math.max(0, Number(value) - 1) : 0;
}
function statusLabel(status: string, staffView = false) {
  return staffView && status === awaitingCustomer ? "Waiting for customer" : statusLabels[status] ?? "Status unavailable";
}

async function loadSupportCases(db: Awaited<ReturnType<typeof createClient>>, userId: string, page: number, inbox: boolean) {
  const offset = page * pageSize;
  const history = db.from("support_cases").select(caseColumns)
    .order("updated_at", { ascending: false }).order("id", { ascending: false });
  let waiting: WaitingCase[] = [];
  let waitingCount = 0;

  if (!inbox) {
    const waitingQuery = () => db.from("support_cases")
      .select(`${caseColumns},latest_reply:support_case_events(created_at)`, page === 0 ? { count: "exact" } : undefined)
      .eq("customer_id", userId).eq("status", awaitingCustomer)
      .eq("latest_reply.event_name", "support.case.staff_replied")
      .order("created_at", { referencedTable: "latest_reply", ascending: false })
      .limit(1, { referencedTable: "latest_reply" })
      .order("updated_at", { ascending: false }).order("id", { ascending: false });

    // Read the count before requesting a later range, which may start past the last waiting case.
    if (page > 0) {
      const countResult = await db.from("support_cases").select("id", { count: "exact", head: true })
        .eq("customer_id", userId).eq("status", awaitingCustomer);
      if (countResult.error) return { error: countResult.error, waiting, other: [], more: false };
      waitingCount = countResult.count ?? 0;
    }
    if (page === 0 || offset < waitingCount) {
      const result = await waitingQuery().range(offset, offset + pageSize - 1);
      if (result.error) return { error: result.error, waiting, other: [], more: false };
      waiting = result.data ?? [];
      waitingCount = result.count ?? waitingCount;
    }
    if (waitingCount > offset + pageSize) return { error: null, waiting, other: [], more: true };
    history.eq("customer_id", userId).neq("status", awaitingCustomer);
  }

  const otherOffset = Math.max(0, offset - waitingCount);
  const otherSlots = pageSize - waiting.length;
  const result = await history.range(otherOffset, otherOffset + otherSlots);
  return {
    error: result.error, waiting, other: (result.data ?? []).slice(0, otherSlots),
    more: (result.data?.length ?? 0) > otherSlots,
  };
}

function SupportCaseList({ cases, inboxContext, timeZone }: { cases: WaitingCase[]; inboxContext: string; timeZone: string }) {
  const date = new Intl.DateTimeFormat("en-US", { timeZone: safeTimeZone(timeZone), dateStyle: "medium" });
  return <ul className="mt-3 space-y-3">
    {cases.map(supportCase => {
      const lastReply = supportCase.latest_reply?.[0]?.created_at;
      return <li key={supportCase.id}>
        <Link href={`/support?case=${supportCase.id}${inboxContext}#conversation`} className={`${styles.ticket} ${styles.caseLink}`}>
          <span className={styles.caseDetails}>
            <strong>{supportCase.subject}</strong>
            <span className={`text-sm ${styles.eyebrow}`}>
              {lastReply && Number.isFinite(Date.parse(lastReply))
                ? <>Last Support reply <time dateTime={lastReply}>{date.format(new Date(lastReply))}</time></>
                : statusLabel(supportCase.status, Boolean(inboxContext))}
            </span>
            <span className={`text-xs ${styles.muted}`}>{supportCase.case_number}</span>
          </span>
          <span className={styles.caseAction}>Open case</span>
        </Link>
      </li>;
    })}
  </ul>;
}

function pageLinks(base: string, page: number, more: boolean, conversation = false) {
  const parameter = conversation ? "messages" : "page";
  const href = (index: number) => `${base}${base.includes("?") ? "&" : "?"}${parameter}=${index + 1}${conversation ? "#conversation" : "#case-list"}`;
  return <nav aria-label={conversation ? "Conversation pages" : "Case pages"} className={styles.pagination}>
    {page > 0 ? <Link href={href(page - 1)}>← Newer {conversation ? "messages" : "cases"}</Link> : null}
    <span>Page {page + 1}</span>
    {more ? <Link href={href(page + 1)}>Older {conversation ? "messages" : "cases"} →</Link> : null}
  </nav>;
}
function transactionDetails(value: unknown, timeZone: string) {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (typeof r.amount !== "number" || !Number.isSafeInteger(r.amount) || typeof r.created_at !== "string" || !Number.isFinite(Date.parse(r.created_at))) return null;
  return {
    amount: `${r.amount > 0 ? "+" : ""}${formatUsdFromCents(r.amount)}`,
    date: formatOfferDeadline(r.created_at, timeZone),
    timestamp: r.created_at,
  };
}

function SupportReceipt({ title, detail, image, amount, timestamp, timeZone, status, reference, href, returnLabel }: {
  title: string;
  detail?: string;
  image?: string;
  amount?: string;
  timestamp?: string | null;
  timeZone: string;
  status?: string;
  reference?: string;
  href: string;
  returnLabel: string;
}) {
  return <aside aria-label="This is about" className={`${note} ${styles.supportReceipt} mb-4 text-sm`}>
    <p className={styles.receiptLabel}>This is about</p>
    <div className={styles.receiptHeading}>
      {image ? <Image src={image} alt="" width={36} height={36} /> : null}
      <div><h3>{title}</h3>{detail ? <p className={styles.muted}>{detail}</p> : null}</div>
      {amount ? <strong className={styles.receiptAmount}>{amount}</strong> : null}
    </div>
    <div className={styles.receiptMeta}>
      {timestamp && Number.isFinite(Date.parse(timestamp)) ? <time dateTime={timestamp}>{formatOfferDeadline(timestamp, timeZone)}</time> : null}
      {status ? <span className={styles.receiptStatus}>{status}</span> : null}
    </div>
    {reference ? <details className={styles.receiptReference}><summary>Reference number</summary><p>{reference}</p></details> : null}
    <Link className={`${styles.ticket} ${styles.button} ${styles.receiptReturn}`} href={href}>{returnLabel}</Link>
  </aside>;
}

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ case?: string; transaction?: string; rewardId?: string; deposit?: string; view?: string; from?: string; orderFilter?: string; page?: string; messages?: string; walletView?: string; details?: string }> }) {
  const query = await searchParams;
  const account = await getAccountContext();
  const validCase = typeof query.case === "string" && uuid.test(query.case) ? query.case : null;
  const validTransaction = typeof query.transaction === "string" && uuid.test(query.transaction) ? query.transaction : null;
  const validReward = typeof query.rewardId === "string" && uuid.test(query.rewardId) ? query.rewardId : null;
  const validDeposit = typeof query.deposit === "string" && depositRequestKeyPattern.test(query.deposit) ? query.deposit : null;
  const next = accountPageReturnPath("/support", query, validCase ? "#conversation" : query.page ? "#case-list" : validReward || validDeposit ? "#report-problem" : "");
  const heading = <><HelpLandingScroll target={validCase ? "conversation" : query.page || query.view === "inbox" ? "case-list" : validTransaction || validReward || validDeposit ? "report-problem" : "support-intro"} visitKey={JSON.stringify(query)} /><header id="support-intro" className={`mb-7 ${styles.anchor}`}><p className="text-xs font-extrabold uppercase tracking-[.18em] text-cyan-300">Here to help</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Support</h1><p className="mt-3 text-white/70">Tell us what happened. Keep the conversation and its status in one place.</p></header></>;
  if (!account) return <PageContainer>{heading}<div className={styles.navigation}><Link className={button} href="/faq#faq-intro">Search frequently asked questions →</Link><Link className={button} href="/forgot-password">Reset your password →</Link></div><div className={card}><p>Sign in to report a problem or view your private support cases.</p><Link href={authNavigationHref("/login", next)} className={`${button} mt-4`}>Sign in to get help</Link></div></PageContainer>;
  if (!isPreviewDataEnvironment()) return <PageContainer>{heading}<p role="status">Support submission is unavailable in this environment.</p></PageContainer>;
  const db = await createClient();
  const access = await db.rpc("has_support_access");
  const staff = access.data === true;
  const inbox = query.view === "inbox" && staff;
  const casePage = pageIndex(query.page);
  const inboxContext = inbox ? `&view=inbox${casePage ? `&page=${casePage + 1}` : ""}` : "";
  const orderFilter = fulfillmentFilter(query.orderFilter);
  const orderContext = orderFilter === "all" ? "" : `&orderFilter=${orderFilter}`;
  const returnToDetails = query.from === "order" && query.details === "1";
  const walletContext = query.from === "wallet" ? "&from=wallet" : "";
  const walletView = query.walletView === "1";
  const caseInboxHref = `/support?view=inbox${casePage ? `&page=${casePage + 1}` : ""}#case-list`;
  const navigation = <nav aria-label="Support navigation" className={styles.navigation}><Link className={button} data-tone="support" href="/support#case-list">My support cases</Link><Link className={button} data-tone="wallet" href={walletTransactionsHref}>Wallet history</Link><Link className={button} href="/faq#faq-intro">Quick answers</Link>{staff ? <Link className={button} href={caseInboxHref}>Private support inbox</Link> : null}</nav>;
  if ((query.case && !validCase) || (query.transaction && !validTransaction) || (query.rewardId && !validReward) || (query.deposit !== undefined && !validDeposit) ||
    (validReward && (validTransaction || validCase)) || (validDeposit && (validCase || validTransaction || validReward || inbox)) ||
    (query.view === "inbox" && !staff)) return <PageContainer>{heading}{navigation}<p role="alert">That support view is not available for your account.</p></PageContainer>;
  if (validCase) {
    const result = await db.from("support_cases").select("id,case_number,subject,status,customer_id,ledger_entry_id").eq("id", validCase).maybeSingle();
    if (result.error || !result.data) return <PageContainer>{heading}{navigation}<p role="alert">This case is unavailable for your account. Return to My support cases to try again.</p></PageContainer>;
    const supportCase = result.data;
    const messagePage = pageIndex(query.messages);
    const events = await db.from("support_case_events").select("id,actor_kind,body,status,created_at").eq("case_id", validCase).order("created_at", { ascending: false }).order("id", { ascending: false }).range(messagePage * pageSize, (messagePage + 1) * pageSize);
    const messages = (events.data ?? []).slice(0, pageSize).reverse();
    const staffView = staff && supportCase.customer_id !== account.userId;
    const transaction = supportCase.ledger_entry_id ? await db.rpc("get_support_case_transaction", { p_case_id: validCase }) : null;
    const charge = transactionDetails(transaction?.data, account.timezone);
    const ownerCase = supportCase.customer_id === account.userId;
    const isPurchaseCharge = Boolean(charge && (transaction?.data as { entry_type?: string } | null)?.entry_type === "PURCHASE_DEBIT");
    const opening = ownerCase && (!supportCase.ledger_entry_id || isPurchaseCharge)
      ? await db.from("support_case_events").select("body").eq("case_id", validCase).eq("event_name", "support.case.opened").maybeSingle()
      : null;
    const openingBody = typeof opening?.data?.body === "string" ? opening.data.body : "";
    const origin = /^Transaction opened from: (wallet|order:(all|processing|fulfilled|exceptions|payment))\n\n/.exec(openingBody);
    const fromWallet = origin ? origin[1] === "wallet" : Boolean(walletContext);
    const fromOrder = origin ? Boolean(origin[2]) : query.from === "order";
    const savedFilter = origin?.[2] ? fulfillmentFilter(origin[2]) : orderFilter;
    const ledgerLink = ownerCase && isPurchaseCharge && !fromWallet && account.orders?.orders.length
      ? await db.from("ledger_entries").select("source_event").eq("customer_id", account.userId).eq("id", supportCase.ledger_entry_id).maybeSingle()
      : null;
    const savedOrder = !ledgerLink?.error && typeof ledgerLink?.data?.source_event === "string"
      ? await getSupportOrder(db, account.userId, ledgerLink.data.source_event, account.orders.orders) : undefined;
    const orderReturn = savedOrder && exactOrderHref(savedOrder.orderNumber, savedFilter, returnToDetails && fromOrder);
    const caseContext = `${inboxContext}${fromWallet ? "&from=wallet" : fromOrder ? `&from=order${savedFilter !== "all" ? `&orderFilter=${savedFilter}` : ""}${returnToDetails ? "&details=1" : ""}` : ""}${walletView ? "&walletView=1" : ""}`;
    const caseHref = `/support?case=${validCase}${caseContext}`;
    const rewardId = /^Reward reference: ([a-f0-9-]{36})\n\n/i.exec(openingBody)?.[1];
    const depositId = /^Deposit reference: ([a-f0-9-]{36})\nDeposit amount: /i.exec(openingBody)?.[1];
    const reward = rewardId ? account.activity.activity.find(item => item.rewardId === rewardId) : undefined;
    const deposit = depositId && account.wallet?.scope === "demo"
      ? await new DemoPaymentProvider(db).getRequests().then(requests => requests.find(request => request.id === depositId)).catch(() => undefined)
      : undefined;
    return <PageContainer>{heading}{navigation}<section id="conversation" className={`${card} ${styles.anchor}`}>
      <p className={`break-all text-xs font-bold uppercase tracking-wide ${styles.eyebrow}`}>Case {supportCase.case_number}</p>
      <h2 className="mt-3 break-words text-2xl font-black">{supportCase.subject}</h2><p className={`mt-2 font-bold ${styles.status}`}>{statusLabel(supportCase.status, staffView)}</p>
      {charge && <div className={`${note} mt-3 text-sm`}><p>Linked wallet transaction: {charge.amount} · {charge.date}</p>
        {orderReturn && <Link href={orderReturn}>Back to this order</Link>}
        {ownerCase && (!orderReturn || !fromOrder) && <Link href={walletView ? walletSupportReturnHref(supportCase.ledger_entry_id, true) : `${walletTransactionsHref.split("#")[0]}&transaction=${supportCase.ledger_entry_id}#transaction-${supportCase.ledger_entry_id}`}>Back to this transaction</Link>}
      </div>}
      {reward && <p className={`${note} mt-3 text-sm`}><Link href={returnToDetails && fromOrder ? fulfillmentHref(rewardId, savedFilter, true) : `/account/wallet?rewardId=${rewardId}#reward-pass`}>Back to this reward · {reward.title}</Link></p>}
      {deposit && <p className={`${note} mt-3 text-sm`}><Link href={depositRecoveryHref(deposit.idempotencyKey)}>Back to this deposit · {formatUsdFromCents(deposit.amount)}</Link></p>}
      <p className={`mt-3 text-sm ${styles.muted}`}>Check this case for the next reply. If more information is needed, you can add it below. No email is sent by this preview.</p>
      {events.error ? <p role="alert" className="mt-5">We couldn’t load the conversation. Refresh to try again.</p> : <ol className="my-6 space-y-4">{messages.map(event => <li key={event.id} data-staff={event.actor_kind === "staff"} className={`${styles.ticket} ${styles.message}`}>
        <p className={`text-xs font-bold ${styles.eyebrow}`}>{event.actor_kind === "staff" ? "Zero Loss support" : "Customer"} · {formatOfferDeadline(event.created_at, account.timezone)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{origin && event.body === openingBody ? openingBody.slice(origin[0].length) : event.body}</p>
      </li>)}</ol>}
      {!events.error ? pageLinks(caseHref, messagePage, (events.data?.length ?? 0) > pageSize, true) : null}
      {messagePage === 0 ? <SupportForm ownerId={account.userId} key={`${validCase}-${events.data?.[0]?.id ?? "new"}`} requestKey={randomUUID()} caseId={validCase} staff={staffView} caseContext={caseContext} /> : <Link className={button} href={`${caseHref}#conversation`}>Return to the latest messages to reply</Link>}
    </section></PageContainer>;
  }
  // Ledger RLS already selects this customer's current wallet. wallet_scope is
  // deliberately not a customer-readable column (including WHERE filters).
  // Scope comes from the authenticated wallet snapshot; the write RPC checks it
  // again independently before attaching the transaction.
  const transaction = validTransaction && account.wallet?.scope === "demo" ? await db.from("ledger_entries").select("id,amount,created_at,entry_type,source_event,related_pool_id,related_entry_id").eq("id", validTransaction).eq("customer_id", account.userId).maybeSingle() : null;
  const charge = transactionDetails(transaction?.data, account.timezone);
  const linkedOrder = !inbox && charge && !transaction?.error && transaction?.data?.entry_type === "PURCHASE_DEBIT"
    ? await getSupportOrder(db, account.userId, transaction.data.source_event, account.orders.orders) : undefined;
  const entryProduct = !inbox && charge && !transaction?.error && transaction?.data && !linkedOrder
    ? (transaction.data.related_entry_id ? account.activity?.activity.find(item => item.entryId === transaction.data?.related_entry_id) : undefined)
      ?? await ledgerEntryProduct(db, account.userId, transaction.data)
    : undefined;
  const returnOrder = walletContext ? undefined : linkedOrder;
  const [transactionTitle] = ledgerDescription(transaction?.data?.entry_type ?? "");
  const reward = validReward ? await db.from("customer_rewards").select("id,created_at").eq("id", validReward).eq("customer_id", account.userId).maybeSingle() : null;
  const linkedReward = validReward ? account.activity?.activity.find(item => item.rewardId === validReward) : undefined;
  const rewardStatus = linkedReward?.rewardStatus === "ready" ? linkedReward.rewardClaimedAt ? "Ready to use" : "Ready to claim"
    : linkedReward?.rewardStatus ? rewardStatuses[linkedReward.rewardStatus] : undefined;
  const deposit = validDeposit && account.wallet?.scope === "demo"
    ? await new DemoPaymentProvider(db).getRequest(validDeposit).catch(() => undefined) : undefined;
  const cases = await loadSupportCases(db, account.userId, casePage, inbox);
  return <PageContainer>{heading}{navigation}{inbox ? <p className={`${note} mb-5 text-sm`}>Private case review and replies only. This inbox cannot issue refunds, adjust balances, or change prizes.</p> : null}
    {!inbox && !validTransaction && !validReward && !validDeposit ? <HelpShortcuts activity={account.activity} /> : null}
    <div className="grid gap-6 lg:grid-cols-2">
      {!inbox ? <section id="report-problem" className={`${card} ${styles.anchor}`}><h2 className="mb-4 text-xl font-black">Report a problem</h2>
        {validDeposit && !deposit ? <p role="alert">We couldn’t verify that deposit for your account. Return to Wallet history to try again. <Link href="/support">Get general support</Link></p> : validReward && (!reward?.data || reward.error) ? <p role="alert">That reward is unavailable for your account. Open your saved reward and try again.</p> : validTransaction && (!transaction?.data || transaction.error) ? <p role="alert">That transaction is unavailable for your account. Return to Wallet history and select your transaction again.</p> : <>
          {charge && validTransaction ? <SupportReceipt
            title={linkedOrder?.title ?? entryProduct?.title ?? transactionTitle}
            detail={linkedOrder || entryProduct ? transactionTitle : undefined}
            image={linkedOrder?.image ?? entryProduct?.image}
            amount={charge.amount} timestamp={charge.timestamp} timeZone={account.timezone}
            status={linkedOrder ? orderStatuses[linkedOrder.status] ?? "Posted" : "Posted"}
            href={returnOrder ? exactOrderHref(returnOrder.orderNumber, orderFilter, returnToDetails) : walletSupportReturnHref(validTransaction, walletView)}
            returnLabel={returnOrder ? "Back to this order" : "Back to this transaction"} /> : null}
          {validReward ? <SupportReceipt
            title={linkedReward?.title ?? "Saved reward"} image={linkedReward?.image}
            amount={linkedReward ? formatUsdFromCents(linkedReward.priceCents) : undefined}
            timestamp={reward?.data?.created_at} timeZone={account.timezone} status={rewardStatus}
            reference={`Reward reference: ${validReward}`}
            href={returnToDetails ? fulfillmentHref(validReward, orderFilter, true) : `/account/wallet?rewardId=${validReward}${orderContext}#reward-pass`} returnLabel="Back to this reward" /> : null}
          {deposit ? <SupportReceipt
            title={deposit.reconciliation === "reconciled" ? "Funds added" : "Deposit request"}
            amount={`${formatUsdFromCents(deposit.amount)} USD`} timestamp={deposit.postedAt ?? deposit.created_at}
            timeZone={account.timezone} status={depositStatuses[deposit.reconciliation]}
            reference={`Deposit reference: ${deposit.id}`}
            href={depositRecoveryHref(deposit.idempotencyKey)} returnLabel="Back to this deposit" /> : null}
          <SupportForm ownerId={account.userId} key={validTransaction ?? validReward ?? validDeposit ?? "new-case"} requestKey={randomUUID()} transactionId={validTransaction ?? undefined} rewardId={validReward ?? undefined} deposit={deposit ? { key: deposit.idempotencyKey, id: deposit.id, amount: deposit.amount } : undefined} caseContext={returnOrder || (validReward && returnToDetails) ? `&from=order${orderContext}${returnToDetails ? "&details=1" : ""}` : `${walletContext}${walletView && validTransaction ? "&walletView=1" : ""}`} transactionOrigin={returnOrder ? `order:${orderFilter}` : walletContext ? "wallet" : undefined} />
        </>}
      </section> : null}
      <section id="case-list" className={`${card} ${styles.anchor} ${inbox ? "lg:col-span-2" : ""}`}><h2 className="text-xl font-black">{inbox ? "Support inbox" : "Your support cases"}</h2>
        {cases.error ? <p role="alert" className="mt-4">We couldn’t load cases. Please refresh to try again.</p>
          : !cases.waiting.length && !cases.other.length ? <p className={`mt-4 ${styles.muted}`}>{casePage > 0 ? "No more cases on this page." : "No cases yet."}</p>
          : <>
            {cases.waiting.length > 0 ? <section aria-labelledby="support-waiting-heading" className="mt-4">
              <h3 id="support-waiting-heading" className={`font-bold ${styles.eyebrow}`}>Waiting for you</h3>
              <SupportCaseList cases={cases.waiting} inboxContext={inboxContext} timeZone={account.timezone} />
            </section> : null}
            {cases.other.length > 0 ? <div className="mt-4">
              {cases.waiting.length > 0 ? <h3 className="font-bold">Other cases</h3> : null}
              <SupportCaseList cases={cases.other} inboxContext={inboxContext} timeZone={account.timezone} />
            </div> : null}
          </>}
        {!cases.error ? pageLinks(inbox ? "/support?view=inbox" : validTransaction ? `/support?transaction=${validTransaction}${walletContext}${orderContext}${walletView ? "&walletView=1" : ""}` : validReward ? `/support?rewardId=${validReward}${orderContext}` : validDeposit ? depositSupportHref(validDeposit).split("#")[0] : "/support", casePage, cases.more) : null}
      </section>
    </div>
  </PageContainer>;
}
