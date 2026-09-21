import Image from "next/image";
import Link from "next/link";
import { walletRewardHref, walletRewards, type AccountActivity, type ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { RewardRedemptionActions } from "./RewardRedemptionActions";
import { RewardClaimControl } from "./RewardClaimControl";
import { DemoIdentityPreviewButton } from "@/components/identity/DemoVerificationDialog";
import styles from "./wallet-rewards.module.css";

export function WalletRewards({ state, view = "ready" }: { state: AccountActivity; view?: "ready" | "history" }) {
  const allRewards = walletRewards(state);
  const ready = allRewards.filter(item => !["redeemed", "expired", "cancelled", "issuance_pending", "issuance_failed"].includes(item.rewardStatus ?? "ready"));
  const history = allRewards.filter(item => !ready.includes(item));
  const rewards = view === "ready" ? ready : history;
  return <main className={styles.page} data-activity-source={state.source}>
    <div className={styles.shell}>
      <div className={styles.topline}>
        <nav aria-label="Wallet sections" className={styles.walletSections}><Link href="/account/wallet" aria-current="page">Gift Cards &amp; Rewards</Link><Link href="/account/wallet?view=history">Funds &amp; history</Link></nav>
      </div>
      <header className={styles.hero}>
        <div className={styles.heroCopy}><h1>Gift Cards &amp; Rewards</h1><p>Keep every retailer reward, redemption, and status together.</p></div>
        <div className={styles.heroStatement}><strong>Shopping should never feel like a loss.</strong><span>Open a reward when you are ready to use it.</span></div>
        <Image className={styles.heroArt} src="/account/playable-wallet-hero-v1.png" alt="Zero Loss leather wallet" width={1536} height={1024} priority sizes="(max-width: 800px) 0px, 360px" />
      </header>

      <section className={styles.content} aria-labelledby="wallet-rewards-heading">
        <div className={styles.contentHeading}><div><h2 id="wallet-rewards-heading">Your retailer gift cards</h2><p>Won and purchased gift cards stay together, with their verified claim and redemption status.</p></div><span className={styles.count}>{allRewards.length} total {allRewards.length === 1 ? "reward" : "rewards"}</span></div>
        <nav aria-label="Reward sections" className={styles.rewardSections}>
          <Link href="/account/wallet" aria-current={view === "ready" ? "page" : undefined}><span>Ready to use</span><b>{ready.length}</b></Link>
          <Link href="/account/wallet?rewards=history" aria-current={view === "history" ? "page" : undefined}><span>History</span><b>{history.length}</b></Link>
        </nav>
        {state.source === "unavailable" ? <p role="status" className={styles.alert}>Rewards unavailable. We can’t verify your account activity right now.</p> : rewards.length === 0 ? <div className={styles.empty}>
          <h3>{view === "ready" ? "No ready gift cards yet" : "No reward history yet"}</h3>
          <p>{view === "ready" ? "Won and purchased retailer gift cards will appear here when they are ready." : "Redeemed, expired and cancelled rewards will remain here for your records."}</p>
          <Link href="/account/entries">View My Activity <span aria-hidden="true">›</span></Link>
        </div> : <div className={styles.rewardGrid}>
          {rewards.map(item => <Link key={item.rewardId ?? item.entryId ?? item.slug} href={walletRewardHref(item)} className={styles.rewardCard}>
            <div className={styles.rewardImage}><Image src={item.image} alt="" fill sizes="(max-width: 580px) 100vw, (max-width: 1000px) 50vw, 33vw" /></div>
            <p className={styles.retailer}>{item.retailer}</p>
            <h3>{item.title}</h3>
            <p className={styles.value}>Retailer gift card · {formatUsdFromCents(item.priceCents)}</p>
            <p className={styles.status}>{item.rewardStatus?.replaceAll("_", " ") ?? "Ready"}</p>
            {state.isPreview ? <p className={styles.sample}>Sample · Not redeemable</p> : null}
            <span className={styles.openReward}>Open reward <span aria-hidden="true">›</span></span>
          </Link>)}
        </div>}
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
export function WalletRewardDetail({ item, isPreview, claimedCode = null }: { item: ActivityItem; isPreview: boolean; claimedCode?: string | null }) {
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

  return <main className={styles.detailPage}>
    <section aria-label="Reward redemption details" className={styles.detailShell}>
      <header className={styles.detailHeading}>
        <div>
          <p className={styles.readyLabel} data-unavailable={!available || (!rewardReady && !canClaim)}><span aria-hidden="true">{rewardReady || canClaim ? "✓" : "!"}</span>{rewardReady ? "Ready to use" : canClaim ? "Reward earned" : notice.title}</p>
          <h1>Your {formatUsdFromCents(item.priceCents)} {item.retailer} reward</h1>
        </div>
        <p className={styles.rewardReference}>Reward for <strong>{item.title}</strong></p>
      </header>

      <div className={styles.rewardSplit}>
        <article className={styles.featuredProduct}>
          <div className={styles.featuredImage}>
            <Image src={item.image} alt={item.title} fill priority sizes="(max-width: 760px) 42vw, 48vw" />
          </div>
          <div className={styles.featuredCopy}>
            <p className={styles.featuredEyebrow}>Featured item from your entry</p>
            <h2>{item.title}</h2>
            <p>This is the product featured in your entry—not a restriction on your reward.</p>
          </div>
        </article>

        <article className={styles.rewardPass}>
          <header className={styles.passHeader}>
            <div><p>{item.retailer} gift card</p><strong>{formatUsdFromCents(item.priceCents)}</strong></div>
            <span aria-hidden="true">♁</span>
          </header>
          {available ? <p className={styles.storewideMessage}><strong>Use it on anything {item.retailer} sells.</strong> Apply it to this featured item—or choose something completely different from {item.retailer}.</p> : null}

          {rewardReady ? <div className={styles.codePanel}>
            <SampleRewardBarcode value={rawCode!.replaceAll(/\D/g, "")} />
            <p className={styles.rewardCode}>{displayCode}</p>
            <p className={styles.codeCaption}>{isPreview ? "Sample — not redeemable" : "Digital gift card number"}</p>
          </div> : !canClaim ? <div className={styles.codePanel}>
            <div role="status" className={styles.notIssued}>
              <div><p>{notice.title}</p><span>{notice.message}</span><Link href="/support" className="mt-3 inline-block font-bold text-[#075b8c] underline">Get reward help</Link></div>
            </div>
          </div> : null}

          {canClaim
            ? <RewardClaimControl rewardId={item.rewardId!} />
            : <RewardRedemptionActions displayCode={rewardReady ? displayCode : null} isPreview={isPreview} />}
          {isPreview && rewardReady && item.status === "prize" && item.rewardId ? <DemoIdentityPreviewButton rewardId={item.rewardId} /> : null}
        </article>
      </div>

      <section aria-labelledby="reward-details-heading" className={styles.rewardDetails}>
        <h2 id="reward-details-heading"><span aria-hidden="true" />Reward details</h2>
        <dl>
          {detailRows.map(([label, value]) => <div key={label}>
            <dt>{label}</dt>
            <dd className={label === "Status" && (rewardReady || canClaim) ? styles.goodStatus : undefined}>{value}</dd>
          </div>)}
        </dl>
      </section>

      <p className={styles.rewardDisclosure}>This retailer gift card is not restricted to the featured product. Availability, pricing, and redemption methods are controlled by {item.retailer}.</p>
      <Link href="/account/wallet" className={styles.backToRewards}>Back to Gift Cards &amp; Rewards</Link>
    </section>
  </main>;
}
