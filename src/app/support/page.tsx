import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import { supportMessageAnchor, supportRewardReturn } from "@/lib/support/references";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { PageContainer } from "@/components/layout/PageContainer";
import { MissingSupportConversation, SupportCaseList, SupportCasePages, type SupportCaseListItem } from "@/components/support/SupportCasePages";
import { SupportForm } from "@/components/support/SupportForm";
import { AuthDestinationLink } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";
import { getAccountContext } from "@/lib/account/context";
import { exactOrderHref, fulfillmentFilter, fulfillmentHref } from "@/lib/account/fulfillment";
import { walletTransactionsHref, type RewardStatus } from "@/lib/account/activity";
import { walletSupportReturnHref } from "@/lib/wallet/ledger-return";
import { getSupportOrder } from "@/lib/account/order-support";
import type { AccountOrderStatus } from "@/lib/account/orders";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { formatOfferDeadline } from "@/lib/account/timezone";
import { accountPageReturnPath } from "@/lib/auth/account-return";
import { DemoPaymentProvider, type DemoFundingRequest } from "@/lib/payments/demo-provider";
import { depositRequestKeyPattern } from "@/lib/payments/provider";
import { notificationFilter, notificationHref, validNotice } from "@/lib/account/notification-return";
import { entryFundingReturnPath, depositRecoveryHref, purchaseOptionReturnPath } from "@/lib/wallet/funding-navigation";
import { depositSupportHref } from "@/lib/support/references";
import { ledgerEntryProduct } from "@/lib/wallet/history";
import { ledgerDescription } from "@/lib/wallet/transaction-links";
import { HelpShortcuts } from "@/components/help/HelpShortcuts";
import { HelpLandingScroll } from "@/components/help/HelpLandingScroll";
import { matchingQueryValue } from "@/lib/navigation/query-value";
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
function pageIndex(value: unknown) {
  return typeof value === "string" && /^\d{1,5}$/.test(value) ? Math.max(0, Number(value) - 1) : 0;
}
function statusLabel(status: string, staffView = false) {
  return staffView && status === awaitingCustomer ? "Waiting for customer" : statusLabels[status] ?? "Status unavailable";
}

async function loadOwnSupportCases(db: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const rows: (SupportCaseListItem & { updated_at: string; latest_reply?: { created_at: string }[] })[] = [];
  const chunkSize = 250;
  const snapshotTime = new Date().toISOString();
  for (let start = 0; ; start += chunkSize) {
    const { data, error } = await db.from("support_cases")
      .select(`${caseColumns},updated_at,latest_reply:support_case_events(created_at)`)
      .eq("customer_id", userId).lte("created_at", snapshotTime)
      .eq("latest_reply.event_name", "support.case.staff_replied")
      .order("created_at", { referencedTable: "latest_reply", ascending: false })
      .limit(1, { referencedTable: "latest_reply" })
      .order("created_at").order("id")
      .range(start, start + chunkSize - 1);
    if (error || !data) return null;
    rows.push(...data);
    if (data.length < chunkSize) break;
  }
  rows.sort((first, second) => Number(second.status === awaitingCustomer) - Number(first.status === awaitingCustomer)
    || second.updated_at.localeCompare(first.updated_at) || second.id.localeCompare(first.id));
  return rows.map(row => ({
    id: row.id, case_number: row.case_number, subject: row.subject, status: row.status,
    lastReply: row.status === awaitingCustomer ? row.latest_reply?.[0]?.created_at : undefined, label: statusLabel(row.status),
  }));
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

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ case?: string | string[]; transaction?: string; rewardId?: string; deposit?: string; view?: string; from?: string; fromOrders?: string; orderFilter?: string; page?: string; messages?: string; messageAnchor?: string; rewardReturn?: string; walletView?: string; details?: string; alerts?: string; notice?: string; checkoutReturn?: string; entryReturn?: string; depositList?: string; fromUpdates?: string; updateCategory?: string }> }) {
  const raw = await searchParams;
  const query = { ...raw, case: matchingQueryValue(raw.case) ?? raw.case };
  const account = await getAccountContext();
  const validCase = typeof query.case === "string" && uuid.test(query.case) ? query.case : null;
  const validTransaction = typeof query.transaction === "string" && uuid.test(query.transaction) ? query.transaction : null;
  const validReward = typeof query.rewardId === "string" && uuid.test(query.rewardId) ? query.rewardId : null;
  const rewardReturn = validReward ? supportRewardReturn(query.rewardReturn, validReward) : null;
  const rewardReturnQuery = rewardReturn ? `&rewardReturn=${encodeURIComponent(rewardReturn)}` : "";
  const validDeposit = typeof query.deposit === "string" && depositRequestKeyPattern.test(query.deposit) ? query.deposit : null;
  const obsoleteView = query.view !== undefined && query.view !== "inbox";
  const returnQuery = obsoleteView ? { ...query, view: undefined } : query;
  const next = accountPageReturnPath("/support", returnQuery, validCase ? "#conversation" : query.page || query.view === "inbox" ? "#case-list" : validTransaction || validReward || validDeposit ? "#report-problem" : "");
  const heading = <><HelpLandingScroll target={validCase ? "conversation" : query.page || query.view === "inbox" ? "case-list" : validTransaction || validReward || validDeposit ? "report-problem" : "support-intro"} visitKey={JSON.stringify(query)} focusReport focusAnchor={validCase ? "conversation" : "case-list"} /><header id="support-intro" className={`mb-7 ${styles.anchor}`}><p className="text-xs font-extrabold uppercase tracking-[.18em] text-cyan-300">Here to help</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Support</h1><p className="mt-3 text-white/70">Tell us what happened. Keep the conversation and its status in one place.</p></header>{obsoleteView ? <p role="status" className={`${note} mb-4`}>That saved Support view is unavailable. The current Support view is shown below.</p> : null}</>;
  if (!account) return <PageContainer>{heading}<div className={styles.navigation}><Link className={button} href="/faq#faq-intro">Search frequently asked questions →</Link><AuthDestinationLink page="/forgot-password" returnTo={next} className={button}>Reset your password →</AuthDestinationLink></div><div id="report-problem" tabIndex={-1} className={`${card} ${styles.anchor}`}><div id="case-list" tabIndex={-1} className={styles.anchor}>{!validCase && <MissingSupportConversation signedOut />}<div id={validCase ? "conversation" : undefined} tabIndex={validCase ? -1 : undefined} className={styles.anchor}><p>{validCase ? "Sign in to view this private support conversation." : "Sign in to report a problem or view your private support cases."}</p><AuthDestinationLink page="/login" returnTo={next} className={`${button} mt-4`}>Sign in to get help</AuthDestinationLink></div></div></div></PageContainer>;
  if (!isPreviewDataEnvironment()) return <PageContainer>{heading}<p role="status">Support submission is unavailable in this environment.</p></PageContainer>;
  const db = await createClient();
  const access = await db.rpc("has_support_access");
  const staff = access.data === true;
  const inbox = query.view === "inbox" && staff;
  const casePage = pageIndex(query.page);
  const inboxContext = `${inbox ? "&view=inbox" : ""}${casePage ? `&page=${casePage + 1}` : ""}`;
  const orderFilter = fulfillmentFilter(query.orderFilter);
  const orderContext = orderFilter === "all" ? "" : `&orderFilter=${orderFilter}`;
  const alerts = query.alerts !== undefined ? notificationFilter(query.alerts) : undefined;
  const notice = validNotice(query.notice) ? query.notice : undefined;
  const alertContext = alerts ? `&alerts=${alerts}${notice ? `&notice=${encodeURIComponent(notice)}` : ""}` : "";
  const checkoutReturn = purchaseOptionReturnPath(query.checkoutReturn) ?? undefined;
  const entryReturn = entryFundingReturnPath(query.entryReturn) ?? undefined;
  const depositList = query.depositList === "1";
  const depositContext = `${checkoutReturn ? `&checkoutReturn=${encodeURIComponent(checkoutReturn)}` : ""}${entryReturn ? `&entryReturn=${encodeURIComponent(entryReturn)}` : ""}${depositList ? "&depositList=1" : ""}`;
  const returnToDetails = query.from === "order" && query.details === "1";
  const walletContext = query.from === "wallet" ? "&from=wallet" : "";
  const walletView = query.walletView === "1";
  const ordersWalletFilter = query.fromOrders === "1" && walletContext && (validTransaction || validCase) ? orderFilter : undefined;
  const walletOrdersContext = ordersWalletFilter ? `&fromOrders=1&orderFilter=${ordersWalletFilter}` : "";
  const caseInboxHref = `/support?view=inbox${casePage ? `&page=${casePage + 1}` : ""}#case-list`;
  const invalidSelection = (query.case !== undefined && !validCase) || (query.transaction !== undefined && !validTransaction) || (query.rewardId !== undefined && !validReward) || (query.deposit !== undefined && !validDeposit) ||
    (validReward && (validTransaction || validCase)) || (validDeposit && (validCase || validTransaction || validReward || inbox)) ||
    (query.view === "inbox" && !staff);
  const caseListHref = validCase ? `/support${!inbox && casePage ? `?page=${casePage + 1}` : ""}#case-list`
    : !inbox && !invalidSelection && (casePage || validTransaction || validReward || validDeposit) ? "#case-list" : "/support#case-list";
  const navigation = <nav aria-label="Support navigation" className={styles.navigation}><a className={button} data-tone="support" href={caseListHref}>My support cases</a><Link className={button} data-tone="wallet" href={walletTransactionsHref}>Wallet history</Link><Link className={button} href="/faq#faq-intro">Quick answers</Link>{staff ? <Link className={button} href={caseInboxHref}>Private support inbox</Link> : null}</nav>;
  if (invalidSelection) return <PageContainer>{heading}{navigation}
      <AccountSettingsLandingScroll target={query.case !== undefined ? "conversation" : "report-problem"} initialTarget={query.case !== undefined ? "conversation" : "report-problem"} focusTarget="support-view-unavailable" allScreens />
      <section id={query.case !== undefined ? "conversation" : "report-problem"} className={`${card} ${styles.anchor}`}>
        <h2 id="support-view-unavailable" tabIndex={-1}><span role="alert">That support view is not available for your account.</span></h2>
        <Link className={button} href="/support#case-list">Return to My support cases</Link>
      </section>
    </PageContainer>;
  if (validCase) {
    const caseReturn = query.fromUpdates === "1" || notice
      ? { href: notificationHref(alerts ?? "all", notice), label: "Back to notifications" }
      : query.from === "contact"
        ? { href: "/contact#recent-conversations-heading", label: "Back to Contact Us conversations" }
        : null;
    const lookup = await Promise.resolve(db.from("support_cases").select("id,case_number,subject,status,customer_id,ledger_entry_id").eq("id", validCase).maybeSingle())
      .then(result => ({ result }), () => ({ result: null }));
    if (!lookup.result || lookup.result.error) return <PageContainer>{heading}{navigation}
      <section id="conversation" className={`${card} ${styles.anchor}`} aria-label="Support conversation unavailable">
        <p role="alert">We couldn’t load this support conversation right now.</p>
        <a className={`${button} mt-3`} href={next}>Retry this conversation</a>
        {caseReturn ? <Link className={button} href={caseReturn.href}>← {caseReturn.label}</Link> : null}
      </section>
    </PageContainer>;
    const result = lookup.result;
    if (!result.data) return <PageContainer>{heading}{navigation}<section id="conversation" className={styles.anchor}>
      <div role="alert">
        <h2 tabIndex={-1} className="font-bold">This case is unavailable for your account.</h2>
        <p>Return to My support cases to try again.</p>
      </div>
      {caseReturn ? <Link className={button} href={caseReturn.href}>← {caseReturn.label}</Link> : null}
    </section></PageContainer>;
    const supportCase = result.data;
    const messagePage = pageIndex(query.messages);
    const messageAnchor = supportMessageAnchor(query.messageAnchor);
    const thread = db.from("support_case_events").select("id,actor_kind,body,status,created_at").eq("case_id", validCase);
    if (messageAnchor) {
      const { createdAt, id } = messageAnchor;
      thread.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lte.${id})`);
    }
    const events = await thread.order("created_at", { ascending: false }).order("id", { ascending: false }).range(messagePage * pageSize, (messagePage + 1) * pageSize);
    const newest = events.data?.[0];
    const pageAnchor = messageAnchor && query.messageAnchor || (messagePage === 0 && newest ? `${newest.created_at}|${newest.id}` : null);
    const messages = (events.data ?? []).slice(0, pageSize).reverse();
    const staffView = staff && supportCase.customer_id !== account.userId;
    const transaction = supportCase.ledger_entry_id ? await db.rpc("get_support_case_transaction", { p_case_id: validCase }) : null;
    const charge = transactionDetails(transaction?.data, account.timezone);
    const ownerCase = supportCase.customer_id === account.userId;
    const isPurchaseCharge = Boolean(charge && (transaction?.data as { entry_type?: string } | null)?.entry_type === "PURCHASE_DEBIT");
    const opening = ownerCase
      ? await db.from("support_case_events").select("body").eq("case_id", validCase).eq("event_name", "support.case.opened").maybeSingle()
      : null;
    const openingBody = typeof opening?.data?.body === "string" ? opening.data.body : "";
    const origin = /^Transaction opened from: (wallet(?::orders:(all|processing|fulfilled|exceptions|payment))?|order:(all|processing|fulfilled|exceptions|payment)(:details)?)\n\n/.exec(openingBody);
    const rewardOrderFilter = /^Reward reference: [a-f0-9-]{36}\nReward opened from: (all|processing|fulfilled|exceptions|payment)\n\n/i.exec(openingBody)?.[1];
    const reopenDetails = returnToDetails || Boolean(rewardOrderFilter || origin?.[4]);
    const fromWallet = origin ? origin[1].startsWith("wallet") : Boolean(walletContext);
    const fromOrder = origin ? Boolean(origin[3]) : query.from === "order" || Boolean(alerts) || Boolean(rewardOrderFilter);
    const originFilter = origin?.[3] ?? rewardOrderFilter;
    const savedWalletFilter = origin?.[2] ? fulfillmentFilter(origin[2]) : ordersWalletFilter;
    const savedFilter = originFilter ? fulfillmentFilter(originFilter) : orderFilter;
    const ledgerLink = ownerCase && isPurchaseCharge && !fromWallet && account.orders?.orders.length
      ? await db.from("ledger_entries").select("source_event").eq("customer_id", account.userId).eq("id", supportCase.ledger_entry_id).maybeSingle()
      : null;
    const savedOrder = !ledgerLink?.error && typeof ledgerLink?.data?.source_event === "string"
      ? await getSupportOrder(db, account.userId, ledgerLink.data.source_event, account.orders.orders) : undefined;
    const orderReturn = savedOrder && exactOrderHref(savedOrder.orderNumber, savedFilter, reopenDetails && fromOrder, Boolean(alerts), alerts, notice);
    const caseContext = `${inboxContext}${fromWallet ? `&from=wallet${savedWalletFilter ? `&fromOrders=1&orderFilter=${savedWalletFilter}` : ""}` : fromOrder ? `&from=order${savedFilter !== "all" ? `&orderFilter=${savedFilter}` : ""}${reopenDetails ? "&details=1" : ""}` : ""}${walletView ? "&walletView=1" : ""}`;
    const headerContext = query.fromUpdates === "1" ? `&fromUpdates=1${query.updateCategory === "support" ? "&updateCategory=support" : ""}` : "";
    const contactOrigin = ownerCase && query.from === "contact";
    const linkedCaseContext = `${caseContext}${contactOrigin && !fromWallet && !fromOrder ? "&from=contact" : ""}${headerContext}${ownerCase ? alertContext : ""}${ownerCase && !supportCase.ledger_entry_id ? depositContext : ""}`;
    const caseHref = `/support?case=${validCase}${linkedCaseContext}`;
    if (messagePage > 0 && !events.error && messages.length === 0) redirect(`${caseHref}#conversation`);
    const rewardOpening = /^Reward reference: ([a-f0-9-]{36})\n(?:Reward opened from: (?:all|processing|fulfilled|exceptions|payment)\n)?(?:Reward return: ([^\n]{1,500})\n)?\n/i.exec(openingBody);
    const rewardId = rewardOpening?.[1];
    const savedRewardReturn = rewardId ? supportRewardReturn(rewardOpening?.[2], rewardId) : null;
    const depositId = /^Deposit reference: ([a-f0-9-]{36})\nDeposit amount: /i.exec(openingBody)?.[1];
    const reward = rewardId ? account.activity.activity.find(item => item.rewardId === rewardId) : undefined;
    const deposit = depositId && account.wallet?.scope === "demo"
      ? await new DemoPaymentProvider(db).getRequests().then(requests => requests.find(request => request.id === depositId)).catch(() => undefined)
      : undefined;
    return <PageContainer>{heading}{navigation}<section id="conversation" className={`${card} ${styles.anchor}`}>
      {contactOrigin ? <Link href="/contact#recent-conversations-heading" scroll={false} className={button}>Back to Contact Us conversations</Link> : null}
      {notice && ownerCase && <Link href={notificationHref(alerts ?? "all", notice)} className={button}>Back to this update</Link>}
      <p className={`break-all text-xs font-bold uppercase tracking-wide ${styles.eyebrow}`}>Case {supportCase.case_number}</p>
      <h2 tabIndex={-1} className="mt-3 break-words text-2xl font-black">{supportCase.subject}</h2><p className={`mt-2 font-bold ${styles.status}`}>{statusLabel(supportCase.status, staffView)}</p>
      {charge && <div className={`${note} mt-3 text-sm`}><p>Linked wallet transaction: {charge.amount} · {charge.date}</p>
        {orderReturn && <Link href={orderReturn}>Back to this order</Link>}
        {ownerCase && (!orderReturn || !fromOrder) && <Link href={walletView || savedWalletFilter ? walletSupportReturnHref(supportCase.ledger_entry_id, walletView, false, savedWalletFilter) : `${walletTransactionsHref.split("#")[0]}&transaction=${supportCase.ledger_entry_id}#transaction-${supportCase.ledger_entry_id}`}>Back to this transaction</Link>}
      </div>}
      {reward && <p className={`${note} mt-3 text-sm`}><Link href={reopenDetails && fromOrder ? fulfillmentHref(rewardId, savedFilter, true, undefined, alerts ? { filter: alerts, notice } : undefined) : savedRewardReturn ?? `/account/wallet?rewardId=${rewardId}#reward-pass`}>Back to this reward · {reward.title}</Link></p>}
      {deposit && <p className={`${note} mt-3 text-sm`}><Link href={depositRecoveryHref(deposit.idempotencyKey, depositList, false, checkoutReturn, entryReturn)}>Back to this deposit · {formatUsdFromCents(deposit.amount)}</Link></p>}
      <p className={`mt-3 text-sm ${styles.muted}`}>Check this case for the next reply. If more information is needed, you can add it below. No email is sent by this preview.</p>
      {events.error ? <p role="alert" className="mt-5">We couldn’t load the conversation. Refresh to try again.</p> : <ol className="my-6 space-y-4">{messages.map(event => <li key={event.id} data-staff={event.actor_kind === "staff"} className={`${styles.ticket} ${styles.message}`}>
        <p className={`text-xs font-bold ${styles.eyebrow}`}>{event.actor_kind === "staff" ? "Zero Loss support" : "Customer"} · {formatOfferDeadline(event.created_at, account.timezone)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{(origin || rewardOpening) && event.body === openingBody ? openingBody.slice((origin ?? rewardOpening)![0].length) : event.body}</p>
      </li>)}</ol>}
      {!events.error ? pageLinks(pageAnchor && supportMessageAnchor(pageAnchor) ? `${caseHref}&messageAnchor=${encodeURIComponent(pageAnchor)}` : caseHref, messagePage, (events.data?.length ?? 0) > pageSize, true) : null}
      {events.error ? <a className={button} href={next}>Retry loading the conversation</a> : messagePage === 0 && !messageAnchor ? <SupportForm ownerId={account.userId} key={`${validCase}-${events.data?.[0]?.id ?? "new"}`} requestKey={randomUUID()} caseId={validCase} staff={staffView} caseContext={linkedCaseContext} /> : <Link className={button} href={`${caseHref}#conversation`}>Return to the latest messages to reply</Link>}
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
    ? await new DemoPaymentProvider(db).getRequest(validDeposit).catch(() => null) : undefined;
  const caseBase = validTransaction ? `/support?transaction=${validTransaction}${walletContext}${walletOrdersContext || orderContext}${returnToDetails ? "&from=order&details=1" : ""}${alertContext}${walletView ? "&walletView=1" : ""}`
    : validReward ? `/support?rewardId=${validReward}${orderContext}${rewardReturnQuery}${returnToDetails ? "&from=order&details=1" : ""}${alertContext}`
    : validDeposit ? depositSupportHref(validDeposit, checkoutReturn, depositList, entryReturn).split("#")[0] : "/support";
  const casesRetryHref = inbox ? caseInboxHref : `${caseBase}${casePage ? `${caseBase.includes("?") ? "&" : "?"}page=${casePage + 1}` : ""}#case-list`;
  const failedCases = <p role="alert" className="mt-4">We couldn’t load cases. <a className="font-bold text-cyan-300 underline" href={casesRetryHref}>Try again.</a></p>;
  const inboxCases = inbox ? await db.from("support_cases").select(caseColumns)
    .order("updated_at", { ascending: false }).order("id", { ascending: false })
    .range(casePage * pageSize, (casePage + 1) * pageSize) : null;
  const cases = inbox ? null : await loadOwnSupportCases(db, account.userId);
  const contextUnavailable = validDeposit && !deposit ? "We couldn’t verify that deposit for your account."
    : validReward && (!reward?.data || reward.error) ? "That reward is unavailable for your account."
    : validTransaction && (!transaction?.data || transaction.error) ? "That transaction is unavailable for your account." : null;
  const lookupFailed = validDeposit && deposit === null || validReward && Boolean(reward?.error) || validTransaction && Boolean(transaction?.error);
  const selectedRecordReturn = !lookupFailed ? null : validDeposit ? depositRecoveryHref(validDeposit, depositList, false, checkoutReturn, entryReturn)
    : validReward ? rewardReturn ?? `/account/wallet?rewardId=${validReward}${orderContext}#reward-pass`
    : validTransaction ? walletSupportReturnHref(validTransaction, walletView, false, ordersWalletFilter)
    : null;
  return <PageContainer>{heading}{navigation}{inbox ? <p className={`${note} mb-5 text-sm`}>Private case review and replies only. This inbox cannot issue refunds, adjust balances, or change prizes.</p> : null}
    {!inbox && !validTransaction && !validReward && !validDeposit ? <HelpShortcuts activity={account.activity} /> : null}
    <div className="grid gap-6 lg:grid-cols-2">
      {!inbox ? <section id="report-problem" className={`${card} ${styles.anchor}`}><h2 tabIndex={-1} className="mb-4 text-xl font-black">Report a problem</h2>
        {contextUnavailable ? <div>
          <p role="alert">{contextUnavailable}</p>
          <div className={styles.navigation}>
            <a className={button} href={next}>Check this record again</a>
            {selectedRecordReturn ? <Link className={button} href={selectedRecordReturn}>Check {validDeposit ? "deposit status" : validReward ? "reward status" : "transaction status"}</Link> : null}
            <Link className={button} href="/support#report-problem">Get general support</Link>
          </div>
        </div> : <>
          {charge && validTransaction ? <SupportReceipt
            title={linkedOrder?.title ?? entryProduct?.title ?? transactionTitle}
            detail={linkedOrder || entryProduct ? transactionTitle : undefined}
            image={linkedOrder?.image ?? entryProduct?.image}
            amount={charge.amount} timestamp={charge.timestamp} timeZone={account.timezone}
            status={linkedOrder ? orderStatuses[linkedOrder.status] ?? "Posted" : "Posted"}
            href={returnOrder ? exactOrderHref(returnOrder.orderNumber, orderFilter, returnToDetails, Boolean(alerts), alerts, notice) : walletSupportReturnHref(validTransaction, walletView, false, ordersWalletFilter)}
            returnLabel={returnOrder ? "Back to this order" : "Back to this transaction"} /> : null}
          {validReward ? <SupportReceipt
            title={linkedReward?.title ?? "Saved reward"} image={linkedReward?.image}
            amount={linkedReward ? formatUsdFromCents(linkedReward.priceCents) : undefined}
            timestamp={reward?.data?.created_at} timeZone={account.timezone} status={rewardStatus}
            reference={`Reward reference: ${validReward}`}
            href={returnToDetails ? fulfillmentHref(validReward, orderFilter, true, undefined, alerts ? { filter: alerts, notice } : undefined) : rewardReturn ?? `/account/wallet?rewardId=${validReward}${orderContext}#reward-pass`} returnLabel="Back to this reward" /> : null}
          {deposit ? <SupportReceipt
            title={deposit.reconciliation === "reconciled" ? "Funds added" : "Deposit request"}
            amount={`${formatUsdFromCents(deposit.amount)} USD`} timestamp={deposit.postedAt ?? deposit.created_at}
            timeZone={account.timezone} status={depositStatuses[deposit.reconciliation]}
            reference={`Deposit reference: ${deposit.id}`}
            href={depositRecoveryHref(deposit.idempotencyKey, depositList, false, checkoutReturn, entryReturn)} returnLabel="Back to this deposit" /> : null}
          <SupportForm ownerId={account.userId} key={validTransaction ?? validReward ?? validDeposit ?? "new-case"} requestKey={randomUUID()} transactionId={validTransaction ?? undefined} rewardId={validReward ?? undefined} deposit={deposit ? { key: deposit.idempotencyKey, id: deposit.id, amount: deposit.amount } : undefined} caseContext={returnOrder || (validReward && returnToDetails) ? `&from=order${orderContext}${returnToDetails ? "&details=1" : ""}${alertContext}` : `${walletContext}${walletOrdersContext}${walletView && validTransaction ? "&walletView=1" : ""}${deposit ? depositContext : ""}`} transactionOrigin={returnOrder || (validReward && returnToDetails) ? `order:${orderFilter}${returnToDetails && returnOrder ? ":details" : ""}` : rewardReturn ? `reward:${rewardReturn}` : ordersWalletFilter ? `wallet:orders:${ordersWalletFilter}` : walletContext ? "wallet" : undefined} allowRecordPicker={!validTransaction && !validReward && !validDeposit} timeZone={account.timezone} />
        </>}
      </section> : null}
      <section id="case-list" tabIndex={-1} className={`${card} ${styles.anchor} ${inbox ? "lg:col-span-2" : ""}`}><h2 tabIndex={-1} className="text-xl font-black">{inbox ? "Support inbox" : "Your support cases"}</h2>
      <MissingSupportConversation />
        {inbox ? inboxCases?.error ? failedCases : <>
          {inboxCases?.data?.length ? <SupportCaseList cases={inboxCases.data.slice(0, pageSize).map(item => ({ ...item, label: statusLabel(item.status, true) }))}
            context={inboxContext} timeZone={account.timezone} /> : <p className={`mt-4 ${styles.muted}`}>{casePage ? "No more cases on this page." : "No cases yet."}</p>}
          {pageLinks("/support?view=inbox", casePage, (inboxCases?.data?.length ?? 0) > pageSize)}
        </> : cases ? <SupportCasePages key={`${account.userId}:${caseBase}`} cases={cases} timeZone={account.timezone} initialPage={casePage} pageSize={pageSize} base={caseBase} />
          : failedCases}
      </section>
    </div>
  </PageContainer>;
}
