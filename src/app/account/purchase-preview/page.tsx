import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PurchaseCheckout } from "@/components/account/PurchaseCheckout";
import { PageContainer } from "@/components/layout/PageContainer";
import type { ActivityItem } from "@/lib/account/activity";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";

export const metadata: Metadata = {
  title: "Purchase walkthrough previews",
  robots: { index: false, follow: false },
};

const sampleOptions: ActivityItem[] = ["6ba4510c", "e38c92bf", "16d74a20"].map(number => ({
  entryId: `sample-entry-${number}`,
  completionOptionId: `sample-option-${number}`,
  slug: "milani-stay-put-eyeliner",
  title: "Milani Stay Put Eyeliner in After Dark",
  retailer: "Walgreens",
  image: "/catalog/marketplace/milani-stay-put-eyeliner.webp",
  status: "completion",
  rewardKind: "digital",
  priceCents: 2500,
  paidCents: 100,
  remainingCents: 2400,
  availability: "Available",
  completionOptionStatus: "available",
  completionExpiresAt: "2026-12-06T05:00:00Z",
}));

export default async function PurchasePreviewPage({ searchParams }: { searchParams: Promise<{ review?: string; wallet?: string; reset?: string }> }) {
  const query = await searchParams;
  if (query.review !== "tickets" || !isPreviewDataEnvironment()) redirect("/account/entries?filter=completion");

  return <>
    <PageContainer className="!py-3 text-center text-sm text-white">
      <strong>Sample purchase walkthrough</strong>
      <p>Uses sample offers and funds. Actions here don’t change your account.</p>
      <nav aria-label="Sample wallet choices" className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2">
        <Link className="underline" href={query.reset === "1" ? "/account/purchase-preview?review=tickets" : "/account/purchase-preview?review=tickets&reset=1"}>Reset sample checkout</Link>
        <Link className="underline" href="/account/purchase-preview?review=tickets&wallet=low">Try adding funds</Link>
      </nav>
    </PageContainer>
    <PurchaseCheckout key={JSON.stringify([query.wallet === "low", query.reset === "1"])} ownerId="purchase-walkthrough" options={sampleOptions}
      initialBalance={query.wallet === "low" ? 2000 : 11000} cards={[
        { token: "demo_card_0002", lastFour: "0002", isDefault: true, isDepositDefault: true },
        { token: "demo_card_5556", lastFour: "5556", isDefault: false },
      ]} fundingAvailable sample />
  </>;
}
