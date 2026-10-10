import Image from "next/image";
import Link from "next/link";
import { readyWalletRewards, walletHistoryHref, walletRewardHref, walletRewards, type AccountActivity, type ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { StatusTicket } from "@/components/account/StatusTicket";
import stripStyles from "@/components/account/account-status-strip.module.css";
import { AccountIcon } from "@/components/account/AccountIcon";
import { accountRoutes } from "@/lib/account/navigation";
import { RewardRedemptionActions } from "./RewardRedemptionActions";
import { RewardClaimControl } from "./RewardClaimControl";
import { DemoRewardRestartControl } from "./DemoRewardRestartControl";
import { DemoIdentityPreviewButton } from "@/components/identity/DemoVerificationDialog";
import { ShareWinWithCrew, type WinShareCrewMember } from "./ShareWinWithCrew";
import styles from "./wallet-rewards.module.css";
import overview from "./gift-rewards-overview.module.css";

type RewardView = "all" | "ready" | "used" | "expired" | "history";

function rewardState(item: ActivityItem) {
  return item.rewardStatus ?? "ready";
}

function rewardLabel(item: ActivityItem) {
  switch (rewardState(item)) {
    case "ready": return "Ready";
    case "redeemed": return "Used";
    case "expired": return "Expired";
    case "cancelled": return "Cancelled";
    case "issuance_pending": return "Being issued";
    case "issuance_failed": return "Needs attention";
  }
}

function claimedDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function WalletRewards({ state, balanceLabel = "Unavailable", fundingEnabled = false, view = "all" }: {
  state: AccountActivity; balanceLabel?: string; fundingEnabled?: boolean; view?: RewardView;
}) {
  const allRewards = walletRewards(state);
  const ready = readyWalletRewards(state);
  const history = allRewards.filter(item => !ready.includes(item));
  const used = allRewards.filter(item => rewardState(item) === "redeemed");
  const expired = allRewards.filter(item => rewardState(item) === "expired");
  const other = history.filter(item => !used.includes(item) && !expired.includes(item));
  const shown = view === "ready" ? ready : view === "used" ? used : view === "expired" ? expired : view === "history" ? history : allRewards;
  const optionCount = state.source === "unavailable" ? null : state.activity.filter(item => item.status === "completion").length;
  const readyCount = state.source === "unavailable" ? null : ready.length;
  const singleReady = ready.length === 1 ? ready[0] : null;
  return <main className={overview.page} data-activity-source={state.source}>
    <div className={overview.shell}>
      <header className={overview.heading}>
        <div><h1>Gift Cards &amp; Rewards</h1><p>Everything you’ve earned, ready when you are.</p></div>
        <nav aria-label="Wallet sections" className={overview.walletSections}><Link href="/account/wallet" aria-current="page">Gift Cards &amp; Rewards</Link><Link href={walletHistoryHref}>Funds &amp; history</Link></nav>
      </header>
      <section aria-label="Your account overview" className={`${stripStyles.row} ${overview.statusTickets}`}>
        <StatusTicket size="top" variant="wallet" label="Playable Wallet" value={balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={fundingEnabled ? `${walletHistoryHref}#add-funds` : undefined} actionDisabled={!fundingEnabled} />
        <StatusTicket size="top" variant="reward" label="Prize Ready" value={readyCount === null ? "Unavailable" : String(readyCount)} action={singleReady ? "View reward" : "View rewards"} href={singleReady ? walletRewardHref(singleReady) : accountRoutes.rewards} />
        <StatusTicket size="top" variant="option" label="Purchase Options" value={optionCount === null ? "Unavailable" : String(optionCount)} action="Review options" href={accountRoutes.purchaseOptions} />
      </section>
      <div className={overview.mainGrid}>
        <section className={`${overview.ticketPanel} ${overview.readySection}`} aria-labelledby="ready-heading">
          <div className={overview.sectionHeading}><h2 id="ready-heading">Ready to use</h2><p>Your available rewards are ready to open and use.</p></div>
          {state.source === "unavailable" ? <p role="status" className={overview.message}>Rewards unavailable. We can’t verify your account activity right now.</p> : ready.length === 0 ? <div className={overview.empty}>
            <h3>No ready gift cards yet</h3><p>Won and purchased retailer gift cards will appear here when they are ready.</p><Link href="/account/entries">View My Activity <AccountIcon name="arrow" /></Link>
          </div> : <div className={overview.readyGrid}>
            {ready.map(item => <Link key={item.rewardId ?? item.entryId ?? item.slug} href={walletRewardHref(item)} className={overview.rewardCard}>
              <span className={overview.readyBadge}><AccountIcon name="prize" />Ready</span>
              <span className={overview.rewardImage}><Image src={item.image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 45vw, 20vw" /></span>
              <span className={overview.rewardTitle}>{item.title}</span>
              <span className={overview.rewardMeta}>{item.retailer} · {formatUsdFromCents(item.priceCents)}</span>
              <span className={overview.delivered}>Delivered to wallet</span>
              {state.isPreview ? <span className={overview.sample}>Sample · Not redeemable</span> : null}
              <span className={overview.openReward}>Open reward <AccountIcon name="arrow" /></span>
            </Link>)}
          </div>}
        </section>
        <aside className={`${overview.ticketPanel} ${overview.summary}`} aria-labelledby="summary-heading">
          <div className={overview.sectionHeading}><h2 id="summary-heading">Reward summary</h2><p>A quick look at your rewards activity.</p></div>
          <div className={overview.summaryRows}>
            <Link href="/account/wallet?rewards=ready" className={overview.summaryRow}><span className={overview.summaryIcon} data-tone="ready"><AccountIcon name="gift" /></span><span><strong>Ready</strong><small>Available to use</small></span><b>{readyCount === null ? "—" : ready.length}</b><AccountIcon name="chevron" /></Link>
            <Link href="/account/wallet?rewards=used" className={overview.summaryRow}><span className={overview.summaryIcon} data-tone="used"><AccountIcon name="active" /></span><span><strong>Used</strong><small>Already redeemed</small></span><b>{state.source === "unavailable" ? "—" : used.length}</b><AccountIcon name="chevron" /></Link>
            <Link href="/account/wallet?rewards=expired" className={overview.summaryRow}><span className={overview.summaryIcon} data-tone="expired"><AccountIcon name="completion" /></span><span><strong>Expired</strong><small>No longer available</small></span><b>{state.source === "unavailable" ? "—" : expired.length}</b><AccountIcon name="chevron" /></Link>
            {other.length > 0 ? <Link href="/account/wallet?rewards=history" className={overview.summaryRow}><span className={overview.summaryIcon} data-tone="other"><AccountIcon name="bell" /></span><span><strong>Other updates</strong><small>See reward status</small></span><b>{other.length}</b><AccountIcon name="chevron" /></Link> : null}
          </div>
        </aside>
      </div>
      <section className={`${overview.ticketPanel} ${overview.historySection}`} aria-labelledby="history-heading">
        <div className={overview.historyHeading}><div><h2 id="history-heading">Reward history</h2><p>Your complete reward activity, from your account records.</p></div>
          <nav aria-label="Filter reward history" className={overview.historyFilters}>
            <Link href="/account/wallet" aria-current={view === "all" ? "page" : undefined}>All</Link>
            <Link href="/account/wallet?rewards=ready" aria-current={view === "ready" ? "page" : undefined}>Ready</Link>
            <Link href="/account/wallet?rewards=used" aria-current={view === "used" ? "page" : undefined}>Used</Link>
            {(expired.length > 0 || view === "expired") && <Link href="/account/wallet?rewards=expired" aria-current={view === "expired" ? "page" : undefined}>Expired</Link>}
            {(other.length > 0 || view === "history") && <Link href="/account/wallet?rewards=history" aria-current={view === "history" ? "page" : undefined}>History</Link>}
          </nav>
        </div>
        {state.source === "unavailable" ? <p role="status" className={overview.message}>Reward history unavailable right now.</p> : shown.length === 0 ? <p className={overview.message}>{view === "all" ? "No reward history yet." : `No ${view === "history" ? "past" : view} rewards yet.`}</p> : <>
          {shown.length > 1 ? <p className={overview.historySwipeHint}>Swipe to browse rewards</p> : null}
          <div className={overview.historyTable} role="group" aria-roledescription="carousel" aria-label="Reward cards" tabIndex={0}>
          <div className={overview.tableHeader} aria-hidden="true"><span>Date</span><span>Reward</span><span>Type</span><span>Status</span><span>Value</span><span className={overview.visuallyHidden}>Open</span></div>
          {shown.map(item => <Link key={item.rewardId ?? item.entryId ?? item.slug} href={walletRewardHref(item)} aria-label={`Open ${item.title}, ${rewardLabel(item)}, ${formatUsdFromCents(item.priceCents)}`} className={overview.historyRow}>
            <span>{claimedDate(item.rewardClaimedAt)}</span><span className={overview.historyReward}><span className={overview.historyImage}><Image src={item.image} alt="" fill sizes="44px" /></span><strong>{item.title}</strong></span>
            <span>Gift Card</span><span><span className={overview.historyStatus} data-status={rewardState(item)}>{rewardLabel(item)}</span></span><span className={overview.historyValue}>{formatUsdFromCents(item.priceCents)}</span><span><AccountIcon name="chevron" /></span>
          </Link>)}
          </div>
        </>}
      </section>
    </div>
  </main>;
}

const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw",
  "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn", "*": "nwnnwnwnn",
};

function sampleRewardNumber(slug: string) {
  let hash = 2166136261;
  for (const character of slug) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const digits = `45${(hash >>> 0).toString().padStart(10, "0")}`.slice(0, 12);
  return { raw: digits, display: digits.match(/.{1,4}/g)?.join(" ") ?? digits };
}

function SampleRewardBarcode({ value }: { value: string }) {
  const bars = `*${value}*`.split("").flatMap((character, characterIndex) => {
    const pattern = CODE39[character] ?? CODE39["0"];
    return [...pattern.split("").map((width, index) => ({
      dark: index % 2 === 0,
      width: width === "w" ? 3 : 1,
      key: `${characterIndex}-${index}`,
    })), { dark: false, width: 1, key: `${characterIndex}-gap` }];
  });
  return <div className={styles.sampleBarcode} aria-label="Sample reward barcode">
    {bars.map(bar => <span key={bar.key} className={bar.dark ? "bg-[#061630]" : "bg-white"} style={{ width: `${bar.width}px` }} />)}
  </div>;
}

/** Responsive reward destination. Preview codes are visibly non-redeemable. */
export function WalletRewardDetail({ item, isPreview, claimedCode = null, overview: accountOverview, crewMembers = [] }: { item: ActivityItem; isPreview: boolean; claimedCode?: string | null; overview?: { activity: AccountActivity; balanceLabel: string; fundingEnabled: boolean }; crewMembers?: WinShareCrewMember[] }) {
  const repeatableDemoOutcome = ["samsung-m70h-tv", "nike-court-shot-shoes", "babys-essentials-bundle"].includes(item.slug);
  const status = item.rewardStatus ?? (item.rewardId ? null : "ready");
  const available = status === "ready";
  // Illustrative cards can keep their sample. A stored reward must use its own
  // authorized credential; a failed/withheld read must never invent a barcode.
  const fallbackSample = isPreview && !item.rewardId && available ? sampleRewardNumber(item.slug) : null;
  const claimed = Boolean(item.rewardClaimedAt || !item.rewardId);
  const rawCode = available && claimed ? (claimedCode?.trim() || fallbackSample?.raw || null) : null;
  const displayCode = rawCode?.replaceAll(/\s/g, "").match(/.{1,4}/g)?.join(" ") ?? rawCode;
  const rewardReady = available && claimed && Boolean(rawCode);
  const canClaim = available && !claimed && Boolean(item.rewardId);
  const notice = status === "expired"
    ? { title: "Reward expired", message: "This reward has expired. Its record remains in your reward history." }
    : status === "cancelled"
      ? { title: "Reward cancelled", message: "This reward was cancelled and is no longer available to use. Its history is preserved." }
      : status === "redeemed"
        ? { title: "Reward redeemed", message: "This reward has already been redeemed. Its record remains here for your reference." }
        : status === "issuance_pending"
          ? { title: "Reward being issued", message: "Your gift card is still being issued. Its number will be available once issuance is complete." }
          : status === "issuance_failed"
            ? { title: "Issuance needs attention", message: "Your gift card could not be issued. Contact support to review this reward." }
            : !item.rewardId && !isPreview
              ? { title: "Not issued yet", message: "No gift card or redeemable barcode has been issued." }
              : { title: "Reward temporarily unavailable", message: "We couldn’t load your saved gift-card number. Refresh to try again, or contact support if this continues." };
  const statusLabel = rewardReady ? (item.rewardClaimedAt ? "Claimed — ready to use" : "Demo ready") : canClaim ? "Ready to claim" : notice.title;
  const claimDeadline = item.rewardClaimExpiresAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(new Date(item.rewardClaimExpiresAt)) : "Not available";
  const detailRows = [
    ["Retailer", item.retailer],
    ["Value", formatUsdFromCents(item.priceCents)],
    ["Status", statusLabel],
    ["Claim by", claimDeadline],
  ];
  const ready = accountOverview ? readyWalletRewards(accountOverview.activity) : [];
  const optionCount = accountOverview?.activity.source === "unavailable" ? null : accountOverview?.activity.activity.filter(activity => activity.status === "completion").length;
  const singleReady = ready.length === 1 ? ready[0] : null;

  return <main className={styles.detailPage}>
    <section aria-label="Reward redemption details" className={styles.detailShell}>
      {accountOverview ? <section aria-label="Your account overview" className={`${stripStyles.row} ${styles.detailStatusStrip}`}>
        <StatusTicket size="top" variant="wallet" label="Playable Wallet" value={accountOverview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={accountOverview.fundingEnabled ? `${walletHistoryHref}#add-funds` : undefined} actionDisabled={!accountOverview.fundingEnabled} />
        <StatusTicket size="top" variant="reward" label="Prize Ready" value={accountOverview.activity.source === "unavailable" ? "Unavailable" : String(ready.length)} action={singleReady ? "View reward" : "View rewards"} href={singleReady ? walletRewardHref(singleReady) : accountRoutes.rewards} />
        <StatusTicket size="top" variant="option" label="Purchase Options" value={optionCount === null || optionCount === undefined ? "Unavailable" : String(optionCount)} action="Review options" href={accountRoutes.purchaseOptions} />
      </section> : null}
      <header className={styles.detailHeading}>
        <div>
          <p className={styles.readyLabel} data-unavailable={!available || (!rewardReady && !canClaim)}><span aria-hidden="true">{rewardReady || canClaim ? "✓" : "!"}</span>{rewardReady ? "Ready to use" : canClaim ? "Reward earned" : notice.title}</p>
          <h1>Your {formatUsdFromCents(item.priceCents)} {item.retailer} reward</h1>
        </div>
        <p className={styles.rewardReference}>Reward for <strong>{item.title}</strong></p>
      </header>

      <div className={styles.rewardSplit}>
        <article className={styles.rewardTicket}>
          <p className={styles.ticketBadge}><AccountIcon name="prize" />{rewardReady ? "Your prize is ready" : canClaim ? "Ready to claim" : notice.title}</p>
          <div className={styles.rewardContent}>
            <div className={styles.featuredProduct}>
              <div className={styles.featuredImage}><Image src={item.image} alt={item.title} fill priority sizes="(max-width: 760px) 85vw, 34vw" /></div>
              <p className={styles.featuredEyebrow}>Featured item from your entry</p>
              <p className={styles.featuredTitle}>{item.title}</p>
              <p className={styles.featuredNote}>This is the product featured in your entry—not a restriction on your reward.</p>
            </div>
            <div className={styles.rewardPass}>
              <h2>{formatUsdFromCents(item.priceCents)} {item.retailer} gift card</h2>
              <p className={styles.rewardIntro}>Your digital reward {rewardReady ? "is ready to use." : canClaim ? "is ready to claim." : "is shown below."}</p>
              {rewardReady ? <div id="reward-barcode" className={styles.codePanel}>
                {/^[0-9]+$/.test(rawCode!.replaceAll(/\s/g, "")) ? <SampleRewardBarcode value={rawCode!.replaceAll(/\s/g, "")} /> : null}
                <p className={styles.rewardCode}>{displayCode}</p>
                <p className={styles.codeCaption}>{isPreview ? "Sample — not redeemable" : "Digital gift card number"}</p>
              </div> : !canClaim ? <div className={styles.codePanel}><div role="status" className={styles.notIssued}>
                <div><p>{notice.title}</p><span>{notice.message}</span><Link href="/support" className="mt-3 inline-block font-bold text-[#075b8c] underline">Get reward help</Link></div>
              </div></div> : null}
              {canClaim ? <RewardClaimControl rewardId={item.rewardId!} /> : <RewardRedemptionActions displayCode={rewardReady ? displayCode : null} isPreview={isPreview} />}
              {isPreview && available && repeatableDemoOutcome && item.rewardId && (item.status === "prize" || item.status === "completed") ? <DemoRewardRestartControl rewardId={item.rewardId} /> : null}
              {isPreview && rewardReady && item.status === "prize" && item.rewardId ? <DemoIdentityPreviewButton rewardId={item.rewardId} /> : null}
            </div>
          </div>
          <section aria-labelledby="reward-details-heading" className={styles.rewardDetails}>
            <h3 id="reward-details-heading">Reward details</h3>
            <dl>{detailRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={label === "Status" && (rewardReady || canClaim) ? styles.goodStatus : undefined}>{value}</dd></div>)}</dl>
          </section>
        </article>
        <aside className={styles.howToTicket} aria-labelledby="how-to-heading">
          <h2 id="how-to-heading">How to use it</h2>
          <p>Follow these steps to use your reward.</p>
          <ol>
            <li><span>1</span><div><strong>Copy or show the code</strong><p>Use the gift-card number above at the retailer. Preview numbers are samples only.</p></div></li>
            <li><span>2</span><div><strong>Redeem at checkout</strong><p>Follow {item.retailer}&apos;s gift-card instructions, online or in store where accepted.</p></div></li>
            <li><span>3</span><div><strong>Enjoy your purchase</strong><p>Use it toward the featured item—or something else {item.retailer} sells.</p></div></li>
          </ol>
          {available ? <p className={styles.storewideMessage}><strong>Use it on anything {item.retailer} sells.</strong> Product availability and redemption methods are set by {item.retailer}.</p> : null}
        </aside>
      </div>

      {item.status === "prize" && item.rewardId ? <ShareWinWithCrew rewardId={item.rewardId} members={crewMembers} /> : null}

      <p className={styles.rewardDisclosure}>This retailer gift card is not restricted to the featured product. Availability, pricing, and redemption methods are controlled by {item.retailer}.</p>
      {isPreview ? <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-[#31e800]/40 bg-[#06223d] p-4 text-center text-white">
        <p className="text-sm font-semibold">Want to see another outcome? Your demo entries and wallet history stay saved.</p>
        <Link href="/browse" className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#31e800] px-5 py-2 text-sm font-black text-[#062218] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Try another demo offer</Link>
      </div> : null}
      <Link href="/account/wallet" className={styles.backToRewards}>Back to Gift Cards &amp; Rewards</Link>
    </section>
  </main>;
}
