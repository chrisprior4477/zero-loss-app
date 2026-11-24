import { AccountReadRetryLink } from "@/components/account/AccountReadRetryLink";
import Image from "next/image";
import Link from "next/link";
import { AccountReadRetryButton } from "@/components/account/AccountReadRetryButton";
import { accountLocale } from "@/lib/account/locale";
import { safeTimeZone } from "@/lib/account/timezone";
import { supportRewardContext } from "@/lib/support/references";
import { activityHref, checkoutRewardsHref, completedActivityHref, isWalletReward, openPrizeOptions, purchasedRewardHref, readyWalletRewards, walletHistoryHref, walletRewardHref, walletRewards, type AccountActivity, type ActivityItem } from "@/lib/account/activity";
import type { CheckoutCard } from "@/lib/account/checkout-cards";
import checkoutStyles from "@/components/account/checkout-gift-cards.module.css";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { StatusTicket } from "@/components/account/StatusTicket";
import stripStyles from "@/components/account/account-status-strip.module.css";
import { AccountIcon } from "@/components/account/AccountIcon";
import { accountRoutes } from "@/lib/account/navigation";
import { fulfillmentFilterLabel, type FulfillmentFilter, fulfillmentHref } from "@/lib/account/fulfillment";
import { rewardSupportHref } from "@/lib/support/references";
import { RewardRedemptionActions } from "./RewardRedemptionActions";
import { SampleRewardBarcode } from "./SampleRewardBarcode";
import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import { RewardPassAutoScroll } from "./RewardPassAutoScroll";
import { WalletRewardLink } from "./WalletRewardLink";
import { WalletLandingScroll } from "./WalletLandingScroll";
import { RewardHistoryCarousel } from "./RewardHistoryCarousel";
import { RewardClaimControl } from "./RewardClaimControl";
import { DemoRewardRestartControl } from "./DemoRewardRestartControl";
import { DemoIdentityPreviewButton } from "@/components/identity/DemoVerificationDialog";
import { ShareWinWithCrew, type WinShareCrewMember } from "./ShareWinWithCrew";
import styles from "./wallet-rewards.module.css";
import overview from "./gift-rewards-overview.module.css";
import { ProductShareButton } from "@/components/product/ProductShareButton";

type RewardView = "all" | "ready" | "used" | "expired" | "history" | "other";

const rewardViewHrefs = {
  all: "/account/wallet#ready-rewards",
  ready: "/account/wallet?rewards=ready#ready-rewards",
  used: "/account/wallet?rewards=used#reward-history",
  expired: "/account/wallet?rewards=expired#reward-history",
  history: "/account/wallet?rewards=history#reward-history",
  other: "/account/wallet?rewards=other#reward-history",
} satisfies Record<RewardView, string>;

function rewardState(item: ActivityItem) {
  if (!isWalletReward(item) && item.completionOptionStatus === "expired") return "expired";
  return item.rewardStatus ?? (item.rewardId && item.rewardStatus === null ? "unknown" : "ready");
}

function rewardLabel(item: ActivityItem, isPreview: boolean) {
  switch (rewardState(item)) {
    case "ready": return !item.rewardId ? (isPreview ? "Demo ready" : "Not issued yet") : item.rewardClaimedAt ? "Ready to use" : "Ready to claim";
    case "redeemed": return "Used";
    case "expired": return "Expired";
    case "cancelled": return "Cancelled";
    case "issuance_pending": return "Being issued";
    case "issuance_failed": return "Needs attention";
    case "unknown": return "Status unavailable";
  }
}

function rewardDate(value: string | null | undefined, timeZone: string, locale?: string | null, deadline = false) {
  const date = new Date(value ?? NaN);
  if (!Number.isFinite(date.getTime())) return deadline ? "Not available" : "—";
  const format: Intl.DateTimeFormatOptions = deadline ? { dateStyle: "long", timeStyle: "short" } : { year: "numeric", month: "short", day: "numeric" };
  return new Intl.DateTimeFormat(accountLocale(locale), { ...format, timeZone: safeTimeZone(timeZone) }).format(date);
}

function rewardGroup(item: ActivityItem) {
  return JSON.stringify([item.slug, item.priceCents]);
}

function cardReference(rewardId: string) {
  return rewardId.slice(-8).toUpperCase();
}

export function WalletRewards({ state, balanceLabel = "Unavailable", fundingEnabled = false, view = "all", prize, invalidPrize = false, invalidWalletView = false, invalidView = false, focusCard, focusHistoryCard, expiredSelection, expiredRetryHref, transactionReturn, timeZone = "America/New_York", cardEndings = {}, locale }: {
  state: AccountActivity; balanceLabel?: string; fundingEnabled?: boolean; view?: RewardView; prize?: string; invalidPrize?: boolean; invalidWalletView?: boolean; invalidView?: boolean; transactionReturn?: string; focusCard?: string; focusHistoryCard?: string; expiredSelection?: "unavailable" | "missing"; expiredRetryHref?: string; timeZone?: string; locale?: string | null; cardEndings?: Record<string, string>;
}) {
  const allRewards = walletRewards(state).filter(item => !prize || item.slug === prize);
  const ready = readyWalletRewards(state).filter(item => !prize || item.slug === prize);
  function scopedHistory(href: string, keepPrize = true) {
    if (!prize && !transactionReturn) return href;
    const url = new URL(href, "https://zeroloss.local");
    if (keepPrize && prize) url.searchParams.set("prize", prize);
    if (transactionReturn) {
      const source = new URL(transactionReturn, "https://zeroloss.local").searchParams;
      for (const key of ["transaction", "walletView", "fromOrders", "orderFilter", "alerts", "notice"]) {
        const value = source.get(key);
        if (value) url.searchParams.set(key, value);
      }
    }
    return url.pathname + url.search + url.hash;
  }
  const cardCounts = new Map<string, number>();
  for (const item of allRewards) {
    if (!item.rewardId) continue;
    const group = rewardGroup(item);
    cardCounts.set(group, (cardCounts.get(group) ?? 0) + 1);
  }
  const repeatedCardRef = (item: ActivityItem) => item.rewardId && (cardCounts.get(rewardGroup(item)) ?? 0) > 1 ? cardReference(item.rewardId) : null;
  const readyToUseCount = ready.filter(item => item.rewardId && item.rewardClaimedAt).length;
  const toClaimCount = ready.filter(item => item.rewardId && !item.rewardClaimedAt).length;
  // Expired purchase options may never have issued a digital reward. Keep their
  // authorized records visible too, with their existing activity destination.
  const records = state.source === "unavailable" ? [] : [...allRewards, ...state.activity.filter(item => (!prize || item.slug === prize) && item.completionOptionStatus === "expired" && !allRewards.includes(item))];
  const rewardInView = (item: ActivityItem) => scopedHistory(`${walletRewardHref(item)}${view === "all" ? "" : `&rewards=${view}`}`);
  const expiredInView = (entryId: string) => {
    const history = view === "expired" && !prize && !transactionReturn ? "" : "&rewardHistory=1";
    return scopedHistory(`/account/wallet?rewards=${view}${history}&expiredEntry=${encodeURIComponent(entryId)}#reward-history`);
  };
  const history = records.filter(item => !ready.includes(item));
  const used = allRewards.filter(item => rewardState(item) === "redeemed");
  const expired = records.filter(item => rewardState(item) === "expired");
  const other = history.filter(item => !used.includes(item) && !expired.includes(item));
  const shown = view === "ready" ? ready : view === "used" ? used : view === "expired" ? expired : view === "history" ? history : view === "other" ? other : records;
  const focusedHistory = view === "used" || view === "expired" || view === "other";
  const optionCount = state.source === "unavailable" || state.incomplete ? null : state.activity.filter(item => item.status === "completion").length;
  const readyCount = state.source === "unavailable" || state.incomplete ? null : ready.length;
  const accountReady = prize ? readyWalletRewards(state) : ready;
  const singleReady = accountReady.length === 1 && readyCount !== null ? accountReady[0] : null;
  const readyFromHistory = view === "history" && Boolean(focusCard) && ready.some(item => item.rewardId === focusCard);
  const readyTarget = (view === "all" || view === "ready" || readyFromHistory) && focusCard
    ? ready.some(item => item.rewardId === focusCard) ? `ready-reward-${focusCard}` : "ready-rewards"
    : undefined;
  const historyTarget = !readyFromHistory && focusHistoryCard && (shown.some(item => (item.rewardId ?? item.entryId) === focusHistoryCard) ? `wallet-reward-${focusHistoryCard}` : "reward-history");
  const missingHistoryCard = Boolean(focusHistoryCard && historyTarget === "reward-history");
  const landingTarget = historyTarget || readyTarget;
  return <div className={overview.page} data-activity-source={state.source}>
    {invalidView ? <AccountSettingsLandingScroll target="ready-rewards" landingAlias="reward-history" initialTarget="ready-rewards" focusTarget="outdated-reward-filter" allScreens />
      : landingTarget && !expiredSelection ? <AccountSettingsLandingScroll target={landingTarget} initialTarget={landingTarget} compactTarget={historyTarget ? "reward-history" : undefined} focusTarget={missingHistoryCard ? "missing-reward-message" : landingTarget === "ready-rewards" ? "ready-heading" : landingTarget} settleAfterNavigation allScreens />
      : prize || view === "ready" ? <AccountSettingsLandingScroll target="ready-rewards" initialTarget="ready-rewards" focusTarget="ready-heading" allScreens restrictToTargetHash /> : <WalletLandingScroll key={view} target="ready-rewards" enabled={view === "all"} />}
    {!invalidView && !expiredSelection && !historyTarget ? <AccountSettingsLandingScroll target="reward-history" initialTarget={view === "expired" ? "reward-history" : undefined} visitKey={view} focusTarget="history-heading" allScreens restrictToTargetHash settleAfterNavigation /> : null}
    <div className={overview.shell}>
      {invalidPrize ? <p role="status" className={overview.message}>That prize filter is unavailable. <Link className="underline" href="/account/wallet#ready-rewards">View all rewards</Link></p> : null}
      {invalidWalletView ? <p role="status" className={overview.message}>That Wallet view is unavailable. <Link className="underline" href={walletHistoryHref}>Open Wallet &amp; Transactions</Link> or <Link className="underline" href="/account/wallet#ready-rewards">view rewards</Link>.</p> : null}
      {prize && <p className={overview.message}>Showing rewards for this prize. <Link className="underline" href={scopedHistory(rewardViewHrefs.all, false)}>View all rewards</Link></p>}
      <header className={overview.heading}>
        <div><h1>Gift Cards &amp; Rewards</h1><p>Everything you’ve earned, ready when you are.</p></div>
        <nav aria-label="Wallet sections" className={overview.walletSections}>{transactionReturn ? <Link href={transactionReturn}>← Back to this transaction</Link> : null}<Link href="/account/wallet" aria-current="page">Gift Cards &amp; Rewards</Link><Link href={walletHistoryHref}>Funds &amp; history</Link><Link href={fulfillmentHref()}>Orders &amp; Fulfillment</Link></nav>
      </header>
      <section aria-label="Your account overview" className={`${stripStyles.row} ${overview.statusTickets}`}>
        <StatusTicket size="top" variant="wallet" label="Playable Wallet" value={balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={fundingEnabled ? `${walletHistoryHref}&panel=funding#add-funds` : undefined} actionDisabled={!fundingEnabled} />
        <StatusTicket size="top" variant="reward" label="Prize Ready" value={readyCount === null ? "Unavailable" : String(accountReady.length)} action={singleReady ? "View reward" : "View rewards"} href={singleReady ? rewardInView(singleReady) : accountReady.length ? rewardViewHrefs.ready : accountRoutes.rewards} />
        <StatusTicket size="top" variant="option" label="Purchase Options" value={optionCount === null ? "Unavailable" : String(optionCount)} action="Continue with Purchase" href={accountRoutes.purchaseOptions} />
      </section>
      {!focusedHistory ? <div className={overview.mainGrid}>
        <section id="ready-rewards" className={`${overview.ticketPanel} ${overview.readySection}`} aria-labelledby="ready-heading">
          {invalidView && <p id="outdated-reward-filter" tabIndex={-1} role="status" className={overview.message}>That reward filter is unavailable. Showing all rewards. <Link className="underline" href={prize ? `/account/wallet?prize=${encodeURIComponent(prize)}#ready-rewards` : "/account/wallet#ready-rewards"}>Clear the outdated filter</Link></p>}
          <div className={overview.sectionHeading}><h2 id="ready-heading" tabIndex={-1}>Available rewards</h2><p>Claim a new reward or open one you’ve already claimed.</p>{readyCount !== null && ready.length > 0 ? <p><strong>{readyToUseCount} ready to use · {toClaimCount} to claim</strong></p> : null}</div>
          {state.source === "unavailable" ? <p role="status" className={overview.message}>Rewards unavailable. We can’t verify your account activity right now. <AccountReadRetryButton label="Retry ready rewards" className="font-bold underline" /></p> : ready.length === 0 ? <div className={overview.empty}>
            <h3>{state.incomplete ? "We couldn’t verify all ready gift cards" : "No ready gift cards yet"}</h3><p>{state.incomplete ? "Try again to check your ready rewards." : "Won and purchased retailer gift cards will appear here when they are ready."}</p>{state.incomplete && <AccountReadRetryButton label="Retry ready rewards" className="font-bold underline" />}<Link href="/account/entries">View My Activity <AccountIcon name="arrow" /></Link>
          </div> : <div className={overview.readyGrid}>
            {ready.map(item => <Link key={item.rewardId ?? item.entryId ?? item.slug} id={item.rewardId ? `ready-reward-${item.rewardId}` : undefined}
              href={item.rewardId ? `${rewardInView(item)}&tile=1` : walletRewardHref(item)} data-history-return className={overview.rewardCard}>
              <span className={overview.readyBadge}><AccountIcon name="prize" />{rewardLabel(item, state.isPreview)}</span>
              <span className={overview.rewardImage}><Image src={item.image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 45vw, 20vw" /></span>
              <span className={overview.rewardTitle}>{item.title}</span>
              <span className={overview.rewardMeta}>{item.retailer} · {formatUsdFromCents(item.priceCents)}</span>
              {repeatedCardRef(item) && item.rewardClaimedAt ? <span className={overview.cardIdentityRow}>
                <span className={overview.savedIdentity}><span>Card ref. <span className={overview.identityValue}>{repeatedCardRef(item)}</span></span><span>Saved in your wallet</span></span>
                <span className={overview.claimIdentity}>
                  {item.rewardId && cardEndings[item.rewardId] ? <strong>Card ending <span className={overview.identityValue}>{cardEndings[item.rewardId]}</span></strong> : null}
                  <span>Claimed <span className={overview.identityValue}>{rewardDate(item.rewardClaimedAt, timeZone, locale)}</span></span>
                </span>
              </span> : <>
                {repeatedCardRef(item) ? <span className={overview.rewardMeta}>Card ref. {repeatedCardRef(item)}</span> : null}
                <span className={overview.delivered}>{item.rewardId && !item.rewardClaimedAt ? "Claim to open your gift card" : item.rewardClaimedAt ? "Saved in your wallet" : state.isPreview ? "Sample reward preview" : "Awaiting gift-card issuance"}</span>
              </>}
              {state.isPreview ? <span className={overview.sample}>Sample · Not redeemable</span> : null}
              <span className={overview.openReward}>{item.rewardId && !item.rewardClaimedAt ? "Claim reward" : item.rewardClaimedAt ? "Open gift card" : "Open reward"} <AccountIcon name="arrow" /></span>
            </Link>)}
          </div>}
        </section>
        <aside className={`${overview.ticketPanel} ${overview.summary}`} aria-labelledby="summary-heading">
          <div className={overview.sectionHeading}><h2 id="summary-heading">Reward summary</h2><p>A quick look at your rewards activity.</p></div>
          <div className={overview.summaryRows}>
            <WalletRewardLink href={scopedHistory(rewardViewHrefs.ready)} className={overview.summaryRow}><span className={overview.summaryIcon} data-tone="ready"><AccountIcon name="gift" /></span><span><strong>Ready</strong><small>To claim or use</small></span><b>{readyCount === null ? "—" : ready.length}</b><AccountIcon name="chevron" /></WalletRewardLink>
            <WalletRewardLink href={scopedHistory(rewardViewHrefs.used)} className={overview.summaryRow}><span className={overview.summaryIcon} data-tone="used"><AccountIcon name="active" /></span><span><strong>Used</strong><small>Already redeemed</small></span><b>{readyCount === null ? "—" : used.length}</b><AccountIcon name="chevron" /></WalletRewardLink>
            <WalletRewardLink href={scopedHistory(rewardViewHrefs.expired)} className={overview.summaryRow}><span className={overview.summaryIcon} data-tone="expired"><AccountIcon name="completion" /></span><span><strong>Expired</strong><small>No longer available</small></span><b>{readyCount === null ? "—" : expired.length}</b><AccountIcon name="chevron" /></WalletRewardLink>
            {other.length > 0 ? <WalletRewardLink href={scopedHistory(rewardViewHrefs.other)} className={overview.summaryRow}><span className={overview.summaryIcon} data-tone="other"><AccountIcon name="bell" /></span><span><strong>Other updates</strong><small>See reward status</small></span><b>{other.length}</b><AccountIcon name="chevron" /></WalletRewardLink> : null}
          </div>
        </aside>
      </div> : null}
      {expiredSelection ? <AccountSettingsLandingScroll target="reward-history" initialTarget="reward-history" focusTarget="expired-selection-message" allScreens settleAfterNavigation /> : null}
      <section id="reward-history" className={`${overview.ticketPanel} ${overview.historySection}`} aria-labelledby="history-heading">
        {missingHistoryCard && !expiredSelection ? <p id="missing-reward-message" role="status" tabIndex={-1}>{state.source === "unavailable" ? "We couldn’t check the selected reward right now." : "That reward is unavailable in this history view."}</p> : null}
        {expiredSelection ? <p id="expired-selection-message" role="status" tabIndex={-1}>{expiredSelection === "unavailable" ? <>We couldn’t check that expired entry right now.{expiredRetryHref && <> <AccountReadRetryLink className="underline" href={expiredRetryHref}>Try again.</AccountReadRetryLink></>}</> : "That expired entry couldn’t be opened. Your available expired history is shown below."}</p> : null}
        <div className={overview.historyHeading}><div><h2 id="history-heading" tabIndex={-1}>{view === "used" ? "Used rewards" : view === "expired" ? "Expired rewards & purchase options" : view === "other" ? "Other reward updates" : "Reward history"}</h2>{!focusedHistory ? <p>{state.incomplete ? "Verified rewards from your account." : "Your complete reward activity, from your account records."}</p> : null}</div>
          <nav aria-label="Filter reward history" className={overview.historyFilters}>
            <WalletRewardLink href={scopedHistory("/account/wallet#reward-history")} aria-current={view === "all" ? "page" : undefined}>All</WalletRewardLink>
            <WalletRewardLink href={scopedHistory("/account/wallet?rewards=ready&rewardHistory=1#reward-history")} aria-current={view === "ready" ? "page" : undefined}>Ready</WalletRewardLink>
            <WalletRewardLink href={scopedHistory(rewardViewHrefs.used)} aria-current={view === "used" ? "page" : undefined}>Used</WalletRewardLink>
            {(expired.length > 0 || focusedHistory) && <WalletRewardLink href={scopedHistory(rewardViewHrefs.expired)} aria-current={view === "expired" ? "page" : undefined}>Expired</WalletRewardLink>}
            {(other.length > 0 || view === "history" || view === "other") && <WalletRewardLink href={scopedHistory(rewardViewHrefs.history)} aria-current={view === "history" ? "page" : undefined}>History</WalletRewardLink>}
          </nav>
        </div>
        {state.source === "unavailable" || state.incomplete && shown.length === 0 ? <p role="status" className={overview.message}>Reward history unavailable right now.</p> : shown.length === 0 ? <div className={overview.message}>
          {view === "used" ? <><p>No rewards used yet. Redeemed gift cards appear here.</p></> : view === "expired" ? <p>No expired rewards or purchase options.</p> : view === "other" ? <p>No other reward updates yet.</p> : <p>{view === "all" ? "No reward history yet." : `No ${view === "history" ? "past" : view} rewards yet.`}</p>}
        </div> : <>
          {shown.length > 1 ? <p className={overview.historySwipeHint}>Swipe or drag to browse rewards</p> : null}
          <RewardHistoryCarousel key={view} focusRow={historyTarget || undefined}>
          <div className={overview.tableHeader} aria-hidden="true"><span>Date</span><span>Reward</span><span>Type</span><span>Status</span><span>Value</span><span className={overview.visuallyHidden}>Open</span></div>
          {shown.map(item => <Link key={item.rewardId ?? item.entryId ?? item.slug} id={item.rewardId || item.entryId ? `wallet-reward-${item.rewardId ?? item.entryId}` : undefined} href={isWalletReward(item) ? `${rewardInView(item)}&rewardHistory=1` : item.entryId ? expiredInView(item.entryId) : activityHref(item)} data-reward-history-link draggable={false} aria-label={`Open ${item.title}, ${rewardLabel(item, state.isPreview)}, ${formatUsdFromCents(item.priceCents)}${repeatedCardRef(item) ? `, card reference ${repeatedCardRef(item)}` : ""}`} className={overview.historyRow}>
            <span>{rewardDate(item.rewardClaimedAt, timeZone, locale)}</span><span className={overview.historyReward}><span className={overview.historyImage}><Image src={item.image} alt="" fill sizes="44px" draggable={false} /></span><span className="min-w-0"><strong>{item.title}</strong>{repeatedCardRef(item) ? <small className="block">Card ref. {repeatedCardRef(item)}</small> : null}</span></span>
            <span>{isWalletReward(item) ? "Gift Card" : "Purchase Option"}</span><span><span className={overview.historyStatus} data-status={rewardState(item)}>{rewardLabel(item, state.isPreview)}</span></span><span className={overview.historyValue}>{formatUsdFromCents(item.priceCents)}</span><span><AccountIcon name="chevron" /></span>
          </Link>)}
          </RewardHistoryCarousel>
        </>}
        {focusedHistory ? <>
          <div className={overview.returnActions} data-reward-view={view}>
            <WalletRewardLink href={scopedHistory(rewardViewHrefs.all, false)}>{view === "expired" ? "Back to Gift Cards & Rewards" : "Return to Gift Cards & Rewards"}<AccountIcon name="arrow" /></WalletRewardLink>
            {view === "expired" ? <Link href={accountRoutes.declinedOffers}>Declined Offers<AccountIcon name="arrow" /></Link> : null}
            <Link href="/">Continue Shopping<AccountIcon name="arrow" /></Link>
          </div>
        </> : null}
      </section>
    </div>
  </div>;
}

function sampleRewardNumber(slug: string) {
  let hash = 2166136261;
  for (const character of slug) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const digits = `45${(hash >>> 0).toString().padStart(10, "0")}`.slice(0, 12);
  return { raw: digits, display: digits.match(/.{1,4}/g)?.join(" ") ?? digits };
}

type CheckoutContext = { receipt: string; cards: CheckoutCard[]; current: CheckoutCard; count: number };

/** Responsive reward destination. Preview codes are visibly non-redeemable. */
export function WalletRewardDetail({ item, isPreview, fromPurchase = false, orderFilter = "all", returnView: sourceView, returnPrize, returnTile = false, returnHistory = false, returnLink, fulfillmentReturn, claimedCode = null, overview: accountOverview, crewMembers = [], sharedCrewRecipients = [], timeZone = "America/New_York", checkoutContext, claimCheckHref, locale }: { timeZone?: string; locale?: string | null; item: ActivityItem; isPreview: boolean; fromPurchase?: boolean; orderFilter?: FulfillmentFilter; returnView?: RewardView; returnPrize?: string; returnTile?: boolean; returnHistory?: boolean; returnLink?: { href: string; label: string }; fulfillmentReturn?: string; claimedCode?: string | null; overview?: { activity: AccountActivity; balanceLabel: string; fundingEnabled: boolean }; crewMembers?: WinShareCrewMember[] | null; sharedCrewRecipients?: string[] | null; checkoutContext?: CheckoutContext; claimCheckHref?: string }) {
  const returnPrizeQuery = returnPrize ? `prize=${encodeURIComponent(returnPrize)}&` : "";
  const returnView = sourceView === "ready" && item.rewardStatus === "expired" ? "expired" : sourceView;
  const directPurchase = item.rewardSource === "purchase" && !item.entryId;
  const repeatableDemoOutcome = ["samsung-m70h-tv", "nike-court-shot-shoes", "babys-essentials-bundle"].includes(item.slug);
  const savedStatus = item.rewardStatus ?? (item.rewardId ? null : "ready");
  const claimDeadlineAt = Date.parse(item.rewardClaimExpiresAt ?? "");
  // This component renders on the server; use the response time for the initial status.
  // eslint-disable-next-line react-hooks/purity
  const status = savedStatus === "ready" && !item.rewardClaimedAt && claimDeadlineAt <= Date.now() ? "expired" : savedStatus;
  const available = status === "ready";
  // Illustrative cards can keep their sample. A stored reward must use its own
  // authorized credential; a failed/withheld read must never invent a barcode.
  const fallbackSample = isPreview && !item.rewardId && available ? sampleRewardNumber(item.slug) : null;
  const claimed = Boolean(item.rewardClaimedAt || !item.rewardId);
  const rawCode = available && claimed ? (claimedCode?.trim() || fallbackSample?.raw || null) : null;
  const displayCode = rawCode?.replaceAll(/\s/g, "").match(/.{1,4}/g)?.join(" ") ?? rawCode;
  const rewardReady = available && claimed && Boolean(rawCode);
  const remainingCount = fromPurchase && accountOverview ? openPrizeOptions(accountOverview.activity.activity, item.slug).length : 0;
  const isWin = item.rewardSource === "winner" || (item.rewardSource !== "purchase" && item.status === "prize");
  const readyMessage = isWin ? "Your prize is ready!" : "Your gift card is ready.";
  const canClaim = available && !claimed && Boolean(item.rewardId);
  const unclaimedDemoPreview = isPreview && canClaim;
  const previewCode = unclaimedDemoPreview ? sampleRewardNumber(item.slug) : null;
  const visibleCode = previewCode?.raw ?? rawCode;
  const notice = status === "expired"
    ? { title: "Reward expired", message: "This reward has expired. Its record remains in your reward history." }
    : status === "cancelled"
      ? { title: "Reward cancelled", message: "This reward was cancelled and is no longer available to use. Its history is preserved." }
      : status === "redeemed"
        ? { title: "Already used", message: "This gift card has already been used. Its record remains here for your reference." }
        : status === "issuance_pending"
          ? { title: "Reward being issued", message: "Your gift card is still being issued. Its number will be available once issuance is complete." }
          : status === "issuance_failed"
            ? { title: "Issuance needs attention", message: "Your gift card could not be issued. Contact support to review this reward." }
            : !item.rewardId && !isPreview
              ? { title: "Not issued yet", message: "No gift card or redeemable barcode has been issued." }
              : { title: "Reward temporarily unavailable", message: "We couldn’t load your saved gift-card number. Try again, or contact support if this continues." };
  const statusLabel = rewardReady ? (item.rewardClaimedAt ? "Claimed — ready to use" : "Demo ready") : canClaim ? "Ready to claim" : notice.title;
  const claimDeadline = rewardDate(item.rewardClaimExpiresAt, timeZone, locale, true);
  const detailRows = [
    ["Retailer", item.retailer],
    ["Value", formatUsdFromCents(item.priceCents)],
    ["Status", statusLabel],
    item.rewardClaimedAt ? ["Claimed on", rewardDate(item.rewardClaimedAt, timeZone, locale)] : ["Claim by", claimDeadline],
  ];
  if (item.rewardId && accountOverview && readyWalletRewards(accountOverview.activity).some(other => other.rewardId && other.rewardId !== item.rewardId && rewardGroup(other) === rewardGroup(item))) {
    detailRows.push(["Card reference", cardReference(item.rewardId)]);
  }
  const walletReturnHref = checkoutContext ? checkoutRewardsHref(item.slug, checkoutContext.receipt, checkoutContext.current.id)
    : returnTile && item.rewardId && available
    ? `/account/wallet?${returnPrizeQuery}${returnView && returnView !== "all" ? `rewards=${returnView}&` : ""}card=${encodeURIComponent(item.rewardId)}${returnView === "history" ? `#ready-reward-${encodeURIComponent(item.rewardId)}` : ""}`
    : returnHistory ? `/account/wallet?${returnPrizeQuery}${returnView && returnView !== "all" ? `rewards=${returnView}&` : ""}rewardHistory=1${item.rewardId ? `&card=${encodeURIComponent(item.rewardId)}#wallet-reward-${encodeURIComponent(item.rewardId)}` : "#reward-history"}`
      : returnView ? `/account/wallet?${returnPrizeQuery}rewards=${returnView}#${item.rewardId ? `wallet-reward-${item.rewardId}` : "reward-history"}`
        : returnPrize ? `/account/wallet?prize=${encodeURIComponent(returnPrize)}#ready-rewards` : "/account/wallet";
  const ready = accountOverview ? readyWalletRewards(accountOverview.activity) : [];
  const optionCount = accountOverview?.activity.source === "unavailable" || accountOverview?.activity.incomplete ? null : accountOverview?.activity.activity.filter(activity => activity.status === "completion").length;
  const singleReady = !accountOverview?.activity.incomplete && ready.length === 1 ? ready[0] : null;

  return <div key={item.rewardId ?? item.slug} className={styles.detailPage}>
    {fromPurchase
      ? <AccountSettingsLandingScroll target="reward-pass" initialTarget="reward-pass" focusTarget="reward-pass-title" visitKey={item.rewardId ?? item.slug} settleAfterNavigation allScreens />
      : <RewardPassAutoScroll rewardKey={item.rewardId ?? item.slug} />}
    <section aria-label="Reward redemption details" className={styles.detailShell}>
      {accountOverview ? <section aria-label="Your account overview" className={`${stripStyles.row} ${styles.detailStatusStrip}`}>
        <StatusTicket size="top" variant="wallet" label="Playable Wallet" value={accountOverview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={accountOverview.fundingEnabled ? `${walletHistoryHref}&panel=funding#add-funds` : undefined} actionDisabled={!accountOverview.fundingEnabled} />
        <StatusTicket size="top" variant="reward" label="Prize Ready" value={accountOverview.activity.source === "unavailable" || accountOverview.activity.incomplete ? "Unavailable" : String(ready.length)} action={singleReady ? "View reward" : "View rewards"} href={singleReady ? walletRewardHref(singleReady) : ready.length ? rewardViewHrefs.ready : accountRoutes.rewards} />
        <StatusTicket size="top" variant="option" label="Purchase Options" value={optionCount === null || optionCount === undefined ? "Unavailable" : String(optionCount)} action="Continue with Purchase" href={accountRoutes.purchaseOptions} />
      </section> : null}
      <header className={styles.detailHeading}>
        <div>
          <p className={styles.readyLabel} data-unavailable={!available || (!rewardReady && !canClaim)}><span aria-hidden="true">{rewardReady || canClaim ? "✓" : "!"}</span>{rewardReady ? "Ready to use" : canClaim ? "Reward earned" : notice.title}</p>
          <h1>Your {formatUsdFromCents(item.priceCents)} {item.retailer} reward</h1>
        </div>
        <Link href="/" className={styles.detailShoppingButton}>Continue shopping</Link>
      </header>

      <div className={styles.rewardSplit}>
        <article className={styles.rewardTicket}>
          <p className={styles.ticketBadge}><AccountIcon name="prize" />{rewardReady ? readyMessage : canClaim ? "Ready to claim" : notice.title}</p>
          <div className={styles.rewardContent}>
            <div className={styles.featuredProduct}>
              <div className={styles.featuredImage}><Image src={item.image} alt={item.title} fill priority sizes="(max-width: 760px) 85vw, 34vw" /></div>
              <p className={styles.featuredEyebrow}>{directPurchase ? "Gift card purchased" : "Featured item from your entry"}</p>
              <p className={styles.featuredTitle}>{item.title}</p>
              {directPurchase ? null : <p className={styles.featuredNote}>This is the product featured in your entry—not a restriction on your reward.</p>}
            </div>
            <div id="reward-pass" className={styles.rewardPass}>
              <h2 id="reward-pass-title" tabIndex={-1}>{formatUsdFromCents(item.priceCents)} {item.retailer} gift card</h2>
              <div className={styles.rewardIntroRow}>
                <p className={styles.rewardIntro}>{rewardReady ? readyMessage : `Your digital reward ${unclaimedDemoPreview ? "is shown in this sample preview. Claim it to open your saved reward." : canClaim ? "is ready to claim." : "is shown below."}`}</p>
                <ProductShareButton product={{ slug: item.slug, title: item.title, image: item.image, retailer: item.retailer, value: item.priceCents / 100, ...(rewardReady && isWin && item.rewardId ? { win: { rewardId: item.rewardId, demo: isPreview } } : {}) }} label={rewardReady && isWin ? "Share your win" : "Share"} className={styles.rewardShare} />
              </div>
              {checkoutContext ? <div className={checkoutStyles.identity}>
                <p><strong>Card {checkoutContext.current.number} of {checkoutContext.count}</strong>
                  <span>Ref. {cardReference(checkoutContext.current.id)}</span></p>
                {checkoutContext.cards.length > 1 ? <nav aria-label="Switch gift cards" className={checkoutStyles.picker}>
                  {checkoutContext.cards.map(({ id, number }) =>
                    id === checkoutContext.current.id ? <span key={id} aria-current="page" aria-label={`Card ${number}, current card`}>{number}</span>
                      : <Link key={id} href={purchasedRewardHref(id, item.slug, checkoutContext.receipt)} prefetch={false} aria-label={`Show card ${number}`}>{number}</Link>)}
                </nav> : null}
              </div> : null}
              {rewardReady || previewCode ? <div id="reward-barcode" className={styles.codePanel}>
                {previewCode ? <p className={styles.previewCodeNotice}>Demo preview · Not claimed</p> : null}
                {/^[0-9]+$/.test((visibleCode ?? "").replaceAll(/\s/g, "")) ? <SampleRewardBarcode value={visibleCode!.replaceAll(/\s/g, "")} /> : null}
                <p className={styles.rewardCode}>{previewCode?.display ?? displayCode}</p>
                <p className={styles.codeCaption}>{previewCode ? "Illustrative number only · Not redeemable" : isPreview ? "Sample — not redeemable" : "Digital gift card number"}</p>
              </div> : !canClaim ? <div className={styles.codePanel}><div role="status" className={styles.notIssued}>
                <div><p>{notice.title}</p><span>{notice.message}</span>{(status === null || available && claimed) && claimCheckHref ? <AccountReadRetryLink href={claimCheckHref} className="mr-4 mt-3 inline-block font-bold text-[#075b8c] underline">Try this reward again</AccountReadRetryLink> : null}<Link href={rewardSupportHref(item.rewardId, orderFilter, claimCheckHref)} className="mt-3 inline-block font-bold text-[#075b8c] underline">Get reward help</Link></div>
              </div></div> : null}
              {canClaim ? <RewardClaimControl rewardId={item.rewardId!} previewShown={unclaimedDemoPreview} checkHref={claimCheckHref} expiresAt={item.rewardClaimExpiresAt} /> : (
                <RewardRedemptionActions displayCode={rewardReady ? displayCode : null} isPreview={isPreview}
                  afterShopping={checkoutContext ? <Link className={`${checkoutStyles.secondary} ${checkoutStyles.returnButton}`} href={completedActivityHref(item.entryId, { slug: item.slug, receipt: checkoutContext.receipt })}>← Back to My Activity</Link> : undefined}
                  remainingOffers={rewardReady && remainingCount > 0 ? { count: remainingCount, retailer: item.retailer, slug: item.slug } : undefined} />
              )}
              {isPreview && available && repeatableDemoOutcome && item.rewardId && (item.status === "prize" || item.status === "completed") ? <DemoRewardRestartControl key={item.rewardId} rewardId={item.rewardId} checkHref={supportRewardContext(claimCheckHref ?? walletRewardHref(item), item.rewardId) ?? `${walletRewardHref(item)}#reward-pass`} /> : null}
              {isPreview && rewardReady && item.status === "prize" && item.rewardId ? <DemoIdentityPreviewButton rewardId={item.rewardId} /> : null}
            </div>
          </div>
          <section aria-labelledby="reward-details-heading" className={styles.rewardDetails}>
            <h3 id="reward-details-heading">Reward details</h3>
            <dl>{detailRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={label === "Status" && (rewardReady || canClaim) ? styles.goodStatus : undefined}>{value}</dd></div>)}</dl>
          </section>
        </article>
        {rewardReady ? <aside className={styles.howToTicket} aria-labelledby="how-to-heading">
          <h2 id="how-to-heading">How to use it</h2>
          <p>Follow these steps to use your reward.</p>
          <ol>
            <li><span>1</span><div><strong>Copy or show the code</strong><p>Use the gift-card number above at the retailer. Preview numbers are samples only.</p></div></li>
            <li><span>2</span><div><strong>Redeem at checkout</strong><p>Follow {item.retailer}&apos;s gift-card instructions, online or in store where accepted.</p></div></li>
            <li><span>3</span><div><strong>Enjoy your purchase</strong><p>Use it toward the featured item—or something else {item.retailer} sells.</p></div></li>
          </ol>
          {available ? <p className={styles.storewideMessage}><strong>Use it on eligible purchases at {item.retailer}.</strong> Product availability and redemption methods are set by {item.retailer}.</p> : null}
        </aside> : canClaim ? <aside className={styles.howToTicket} aria-labelledby="how-to-heading">
          <h2 id="how-to-heading">How to use it</h2>
          <p>Claim your reward to open your saved gift-card number.</p>
        </aside> : null}
      </div>

      {item.status === "prize" && item.rewardId ? crewMembers === null ? <p role="status" className={styles.backToRewards}>We couldn’t load your Crew. <AccountReadRetryLink href={claimCheckHref ?? walletRewardHref(item)}>Retry loading Crew</AccountReadRetryLink></p> : <ShareWinWithCrew key={item.rewardId} rewardId={item.rewardId} members={crewMembers} initialShared={sharedCrewRecipients} /> : null}

      <p className={styles.rewardDisclosure}>This retailer gift card is not restricted to the featured product. Availability, pricing, and redemption methods are controlled by {item.retailer}.</p>
      {isPreview ? <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-[#31e800]/40 bg-[#06223d] p-4 text-center text-white">
        <p className="text-sm font-semibold">Want to see another outcome? Your demo entries and wallet history stay saved.</p>
        <Link href="/browse" className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#31e800] px-5 py-2 text-sm font-black text-[#062218] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Try another demo offer</Link>
      </div> : null}
      <nav aria-label="Reward detail exits" className={styles.detailExitActions}>
        {item.rewardId ? <Link href={fulfillmentReturn ?? fulfillmentHref(item.rewardId, orderFilter)} className={styles.backToRewards}>View fulfillment status</Link> : null}
        {orderFilter !== "all" && !returnLink?.href.startsWith("/account/orders?") ? <Link href={fulfillmentHref(undefined, orderFilter, false, item.rewardId ?? undefined)} className={styles.backToRewards}>Return to {fulfillmentFilterLabel[orderFilter]}</Link> : null}
        <Link href="/" className={styles.detailShoppingButton}>Continue shopping</Link>
        <Link href={returnLink?.href ?? walletReturnHref} className={styles.backToRewards}>{returnLink?.label ?? "Back to Gift Cards & Rewards"}</Link>
      </nav>
    </section>
  </div>;
}
