import type { Metadata } from "next";
import { PurchaseJourneyPreview } from "@/components/account/purchase-preview/PurchaseJourneyPreview";

export const metadata: Metadata = {
  title: "Purchase walkthrough previews",
  robots: { index: false, follow: false },
};

export default async function PurchasePreviewPage({ searchParams }: {
  searchParams: Promise<{ version?: string }>;
}) {
  const { version } = await searchParams;
  return <PurchaseJourneyPreview initialVersion={version === "1" ? 1 : version === "2" ? 2 : version === "4" ? 4 : 3} />;
}
