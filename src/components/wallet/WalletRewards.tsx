import { ContinueShoppingLink } from "@/components/catalog/ContinueShoppingLink";
import Image from "next/image";
import Link from "next/link";
import { activityHref, isWalletReward, readyWalletRewards, walletHistoryHref, walletRewardHref, walletRewards, type AccountActivity, type ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { StatusTicket } from "@/components/account/StatusTicket";
import stripStyles from "@/components/account/account-status-strip.module.css";
import { AccountIcon } from "@/components/account/AccountIcon";
import { accountRoutes } from "@/lib/account/navigation";
import { fulfillmentHref } from "@/lib/account/fulfillment";
import { RewardRedemptionActions } from "./RewardRedemptionActions";
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

type RewardView = "all" | "ready" | "used" | "expired" | "history";

const rewardViewHrefs = {
  all: "/account/wallet#ready-rewards",
  ready: "/account/wallet?rewards=ready#ready-rewards",
  used: "/account/wallet?rewards=used#reward-history",
  expired: "/account/wallet?rewards=expired#reward-history",
  history: "/account/wallet?rewards=history#reward-history",
} satisfies Record<RewardView, string>;

function rewardState(item: ActivityItem) {
  if (!isWalletReward(item) && item.completionOptionStatus === "expired") return "expired";
  return item.rewardStatus ?? "ready";
}

function rewardLabel(item: ActivityItem, isPreview: boolean) {
  switch (rewardState(item)) {
    case "ready": return !item.rewardId ? (isPreview ? "Demo ready" : "Not issued yet") : item.rewardClaimedAt ? "Ready to use" : "Ready to claim";
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
  // Expired purchase options may never have issued a digital reward. Keep their
  // authorized records visible too, with their existing activity destination.
  const records = state.source === "unavailable" ? [] : [...allRewards, ...state.activity.filter(item => item.completionOptionStatus === "expired" && !allRewards.includes(item))];
  const history = records.filter(item => !ready.includes(item));
  const used = allRewards.filter(item => rewardState(item) === "redeemed");
  const expired = records.filter(item => rewardState(item) === "expired");
  const other = history.filter(item => !used.includes(item) && !expired.includes(item));
  const shown = view === "ready" ? ready : view === "used" ? used : view === "expired" ? expired : view === "history" ? history : records;
  const focusedHistory = view === "used" || view === "expired";
  const optionCount = state.source === "unavailable" ? null : state.activity.filter(item => item.status === "completion").length;
  const readyCount = state.source === "unavailable" ? null : ready.length;
  const singleReady = ready.length === 1 ? ready[0] : null;
  return <main className={overview.page} data-activity-source={state.source}>
    <WalletLandingScroll key={view} target="ready-rewards" enabled={view === "all" || view === "ready"} />
    <div className={overview.shell}>
      <header className={overview.heading}>
        <div><h1>Gift Cards &amp; Rewards</h1><p>Everything you’ve earned, ready when you are.</p></div>
        <nav aria-label="Wallet sections" className={overview.walletSections}><Link href="/account/wallet" aria-current="page">Gift Cards &amp; Rewards</Link><Link href={walletHistoryHref}>Funds &amp; history</Link><Link href={fulfillmentHref()}>Orders &amp; Fulfillment</Link></nav>
      </header>
      <section aria-label="Your account overview" className={`${stripStyles.row} ${overview.statusTickets}`}>
        <StatusTicket size="top" variant="wallet" label="Playable Wallet" value={balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={fundingEnabled ? `${walletHistoryHref}#add-funds` : undefined} actionDisabled={!fundingEnabled} />
        <StatusTicket size="top" variant="reward" label="Prize Ready" value={readyCount === null ? "Unavailable" : String(readyCount)} action={singleReady ? "View reward" : "View rewards"} href={singleReady ? walletRewardHref(singleReady) : accountRoutes.rewards} />
        <StatusTicket size="top" variant="option" label="Purchase Options" value={optionCount === null ? "Unavailable" : String(optionCount)} action="Continue with Purchase" href={accountRoutes.purchaseOptions} />
      </section>
      {!focusedHistory ? <div className={overview.mainGrid}>
        <section id="ready-rewards" className={`${overview.ticketPanel} ${overview.readySection}`} aria-labelledby="ready-heading">
          <div className={overview.sectionHeading}><h2 id="ready-heading">Available rewards</h2><p>Claim a new reward or open one you’ve already claimed.</p></div>
          {state.source === "unavailable" ? <p role="status" className={overview.message}>Rewards unavailable. We can’t verify your account activity right now.</p> : ready.length === 0 ? <div className={overview.empty}>
            <h3>No ready gift cards yet</h3><p>Won and purchased retailer gift cards will appear here when they are ready.</p><Link href="/account/entries">View My Activity <AccountIcon name="arrow" /></Link>
          </div> : <div className={overview.readyGrid}>
            {ready.map(item => <Link key={item.rewardId ?? item.entryId ?? item.slug} href={walletRewardHref(item)} className={overview.rewardCard}>
              <span className={overview.readyBadge}><AccountIcon name="prize" />{rewardLabel(item, state.isPreview)}</span>
              <span className={overview.rewardImage}><Image src={item.image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 45vw, 20vw" /></span>
              <span className={overview.rewardTitle}>{item.title}</span>
              <span className={overview.rewardMeta}>{item.retailer} · {formatUsdFromCents(item.priceCents)}</span>
              <span className={overview.delivered}>{item.rewardId && !item.rewardClaimedAt ? "Claim to open your gift card" : item.rewardClaimedAt ? "Saved in your wallet" : state.isPreview ? "Sample reward preview" : "Awaiting gift-card issuance"}</span>
              {state.isPreview ? <span className={overview.sample}>Sample · Not redeemable</span> : null}
              <span className={overview.openReward}>{item.rewardId && !item.rewardClaimedAt ? "Claim reward" : "Open reward"} <AccountIcon name="arrow" /></span>
            </Link>)}
          </div>}
        </section>
        <aside className={`${overview.ticketPanel} ${overview.summary}`} aria-labelledby="summary-heading">
          <div className={overview.sectionHeading}><h2 id="summary-heading">Reward summary</h2><p>A quick look at your rewards activity.</p></div>
          <div className={overview.summaryRows}>
            <WalletRewardLink href={rewardViewHrefs.ready} className={overview.summaryRow}><span className={overview.summaryIcon} data-tone="ready"><AccountIcon name="gift" /></span><span><strong>Ready</strong><small>To claim or use</small></span><b>{readyCount === null ? "—" : ready.length}</b><AccountIcon name="chevron" /></WalletRewardLink>
            <WalletRewardLink href={rewardViewHrefs.used} className={overview.summaryRow}><span className={overview.summaryIcon} data-tone="used"><AccountIcon name="active" /></span><span><strong>Used</strong><small>Already redeemed</small></span><b>{state.source === "unavailable" ? "—" : used.length}</b><AccountIcon name="chevron" /></WalletRewardLink>
            <WalletRewardLink href={rewardViewHrefs.expired} className={overview.summaryRow}><span className={overview.summaryIcon} data-tone="expired"><AccountIcon name="completion" /></span><span><strong>Expired</strong><small>No longer available</small></span><b>{state.source === "unavailable" ? "—" : expired.length}</b><AccountIcon name="chevron" /></WalletRewardLink>
            {other.length > 0 ? <WalletRewardLink href={rewardViewHrefs.history} className={overview.summaryRow}><span className={overview.summaryIcon} data-tone="other"><AccountIcon name="bell" /></span><span><strong>Other updates</strong><small>See reward status</small></span><b>{other.length}</b><AccountIcon name="chevron" /></WalletRewardLink> : null}
          </div>
        </aside>
      </div> : null}
      <section id="reward-history" className={`${overview.ticketPanel} ${overview.historySection}`} aria-labelledby="history-heading">
        <div className={overview.historyHeading}><div><h2 id="history-heading">{view === "used" ? "Used rewards" : view === "expired" ? "Expired rewards & purchase options" : "Reward history"}</h2>{!focusedHistory ? <p>Your complete reward activity, from your account records.</p> : null}</div>
          <nav aria-label="Filter reward history" className={overview.historyFilters}>
            <WalletRewardLink href={rewardViewHrefs.all} aria-current={view === "all" ? "page" : undefined}>All</WalletRewardLink>
            <WalletRewardLink href={rewardViewHrefs.ready} aria-current={view === "ready" ? "page" : undefined}>Ready</WalletRewardLink>
            <WalletRewardLink href={rewardViewHrefs.used} aria-current={view === "used" ? "page" : undefined}>Used</WalletRewardLink>
            {(expired.length > 0 || focusedHistory) && <WalletRewardLink href={rewardViewHrefs.expired} aria-current={view === "expired" ? "page" : undefined}>Expired</WalletRewardLink>}
            {(other.length > 0 || view === "history") && <WalletRewardLink href={rewardViewHrefs.history} aria-current={view === "history" ? "page" : undefined}>History</WalletRewardLink>}
          </nav>
        </div>
        {state.source === "unavailable" ? <p role="status" className={overview.message}>Reward history unavailable right now.</p> : shown.length === 0 ? <div className={overview.message}>
          {view === "used" ? <><p>You haven’t used or transferred any prizes you’ve won or rewards from completed purchase options.</p><p>Please check back after you’ve used or transferred a reward.</p></> : view === "expired" ? <p>You do not have any expired purchase options yet.</p> : <p>{view === "all" ? "No reward history yet." : `No ${view === "history" ? "past" : view} rewards yet.`}</p>}
        </div> : <>
          {shown.length > 1 ? <p className={overview.historySwipeHint}>Swipe or drag to browse rewards</p> : null}
          <RewardHistoryCarousel key={view}>
          <div className={overview.tableHeader} aria-hidden="true"><span>Date</span><span>Reward</span><span>Type</span><span>Status</span><span>Value</span><span className={overview.visuallyHidden}>Open</span></div>
          {shown.map(item => <Link key={item.rewardId ?? item.entryId ?? item.slug} href={isWalletReward(item) ? walletRewardHref(item) : activityHref(item)} draggable={false} aria-label={`Open ${item.title}, ${rewardLabel(item, state.isPreview)}, ${formatUsdFromCents(item.priceCents)}`} className={overview.historyRow}>
            <span>{claimedDate(item.rewardClaimedAt)}</span><span className={overview.historyReward}><span className={overview.historyImage}><Image src={item.image} alt="" fill sizes="44px" draggable={false} /></span><strong>{item.title}</strong></span>
            <span>{isWalletReward(item) ? "Gift Card" : "Purchase Option"}</span><span><span className={overview.historyStatus} data-status={rewardState(item)}>{rewardLabel(item, state.isPreview)}</span></span><span className={overview.historyValue}>{formatUsdFromCents(item.priceCents)}</span><span><AccountIcon name="chevron" /></span>
          </Link>)}
          </RewardHistoryCarousel>
        </>}
        {focusedHistory ? <>
          {view === "expired" ? <p className={overview.message}>Remember to check your Declined Offers page.</p> : null}
          <div className={overview.returnActions}>
            <WalletRewardLink href={view === "expired" ? accountRoutes.declinedOffers : rewardViewHrefs.all}>{view === "expired" ? "Declined Offers" : "Return to Gift Cards & Rewards"}<AccountIcon name="arrow" /></WalletRewardLink>
            <ContinueShoppingLink>Continue Shopping<AccountIcon name="arrow" /></ContinueShoppingLink>
          </div>
        </> : null}
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
              : { title: "Reward temporarily unavailable", message: "We couldn’t load your saved gift-card number. Refresh to try again, or contact support if this continues." };
  const statusLabel = rewardReady ? (item.rewardClaimedAt ? "Claimed — ready to use" : "Demo ready") : canClaim ? "Ready to claim" : notice.title;
  const claimDeadline = item.rewardClaimExpiresAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(new Date(item.rewardClaimExpiresAt)) : "Not available";
  const detailRows = [
    ["Retailer", item.retailer],
    ["Value", formatUsdFromCents(item.priceCents)],
    ["Status", statusLabel],
    item.rewardClaimedAt ? ["Claimed on", claimedDate(item.rewardClaimedAt)] : ["Claim by", claimDeadline],
  ];
  const ready = accountOverview ? readyWalletRewards(accountOverview.activity) : [];
  const optionCount = accountOverview?.activity.source === "unavailable" ? null : accountOverview?.activity.activity.filter(activity => activity.status === "completion").length;
  const singleReady = ready.length === 1 ? ready[0] : null;

  return <main className={styles.detailPage}>
    <RewardPassAutoScroll rewardKey={item.rewardId ?? item.slug} />
    <section aria-label="Reward redemption details" className={styles.detailShell}>
      {accountOverview ? <section aria-label="Your account overview" className={`${stripStyles.row} ${styles.detailStatusStrip}`}>
        <StatusTicket size="top" variant="wallet" label="Playable Wallet" value={accountOverview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={accountOverview.fundingEnabled ? `${walletHistoryHref}#add-funds` : undefined} actionDisabled={!accountOverview.fundingEnabled} />
        <StatusTicket size="top" variant="reward" label="Prize Ready" value={accountOverview.activity.source === "unavailable" ? "Unavailable" : String(ready.length)} action={singleReady ? "View reward" : "View rewards"} href={singleReady ? walletRewardHref(singleReady) : accountRoutes.rewards} />
        <StatusTicket size="top" variant="option" label="Purchase Options" value={optionCount === null || optionCount === undefined ? "Unavailable" : String(optionCount)} action="Continue with Purchase" href={accountRoutes.purchaseOptions} />
      </section> : null}
      <header className={styles.detailHeading}>
        <div>
          <p className={styles.readyLabel} data-unavailable={!available || (!rewardReady && !canClaim)}><span aria-hidden="true">{rewardReady || canClaim ? "✓" : "!"}</span>{rewardReady ? "Ready to use" : canClaim ? "Reward earned" : notice.title}</p>
          <h1>Your {formatUsdFromCents(item.priceCents)} {item.retailer} reward</h1>
        </div>
        <ContinueShoppingLink  className={styles.detailShoppingButton}>Continue shopping</ContinueShoppingLink>
      </header>

      <div className={styles.rewardSplit}>
        <article className={styles.rewardTicket}>
          <p className={styles.ticketBadge}><AccountIcon name="prize" />{rewardReady ? readyMessage : canClaim ? "Ready to claim" : notice.title}</p>
          <div className={styles.rewardContent}>
            <div className={styles.featuredProduct}>
              <div className={styles.featuredImage}><Image src={item.image} alt={item.title} fill priority sizes="(max-width: 760px) 85vw, 34vw" /></div>
              <p className={styles.featuredEyebrow}>Featured item from your entry</p>
              <p className={styles.featuredTitle}>{item.title}</p>
              <p className={styles.featuredNote}>This is the product featured in your entry—not a restriction on your reward.</p>
            </div>
            <div id="reward-pass" className={styles.rewardPass}>
              <h2>{formatUsdFromCents(item.priceCents)} {item.retailer} gift card</h2>
              <div className={styles.rewardIntroRow}>
                <p className={styles.rewardIntro}>{rewardReady ? readyMessage : `Your digital reward ${unclaimedDemoPreview ? "is shown in this sample preview. Claim it to open your saved reward." : canClaim ? "is ready to claim." : "is shown below."}`}</p>
                <ProductShareButton product={{ slug: item.slug, title: item.title, image: item.image, retailer: item.retailer, value: item.priceCents / 100, ...(rewardReady && isWin && item.rewardId ? { win: { rewardId: item.rewardId, demo: isPreview } } : {}) }} label={rewardReady && isWin ? "Share your win" : "Share"} className={styles.rewardShare} />
              </div>
              {rewardReady || previewCode ? <div id="reward-barcode" className={styles.codePanel}>
                {previewCode ? <p className={styles.previewCodeNotice}>Demo preview · Not claimed</p> : null}
                {/^[0-9]+$/.test((visibleCode ?? "").replaceAll(/\s/g, "")) ? <SampleRewardBarcode value={visibleCode!.replaceAll(/\s/g, "")} /> : null}
                <p className={styles.rewardCode}>{previewCode?.display ?? displayCode}</p>
                <p className={styles.codeCaption}>{previewCode ? "Illustrative number only · Not redeemable" : isPreview ? "Sample — not redeemable" : "Digital gift card number"}</p>
              </div> : !canClaim ? <div className={styles.codePanel}><div role="status" className={styles.notIssued}>
                <div><p>{notice.title}</p><span>{notice.message}</span><Link href="/support" className="mt-3 inline-block font-bold text-[#075b8c] underline">Get reward help</Link></div>
              </div></div> : null}
              {canClaim ? <RewardClaimControl rewardId={item.rewardId!} previewShown={unclaimedDemoPreview} /> : <RewardRedemptionActions displayCode={rewardReady ? displayCode : null} isPreview={isPreview} />}
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
      <nav aria-label="Reward detail exits" className={styles.detailExitActions}>
        {item.rewardId ? <Link href={fulfillmentHref(item.rewardId)} className={styles.backToRewards}>View fulfillment status</Link> : null}
        <ContinueShoppingLink  className={styles.detailShoppingButton}>Continue shopping</ContinueShoppingLink>
        <Link href="/account/wallet" className={styles.backToRewards}>Back to Gift Cards &amp; Rewards</Link>
      </nav>
    </section>
  </main>;
}
