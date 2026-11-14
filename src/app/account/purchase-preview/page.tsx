import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutGiftCardsPreview } from "@/components/account/purchase-preview/CheckoutGiftCardsPreview";
import { getDemoProduct } from "@/lib/catalog/demo-products";

export const metadata: Metadata = {
  title: "Purchase walkthrough previews",
  robots: { index: false, follow: false },
};

export default async function PurchasePreviewPage({ searchParams }: PageProps<"/account/purchase-preview">) {
  const { walkthrough } = await searchParams;
  const product = getDemoProduct("logitech-mx-master-3s");
  if (walkthrough !== "gift-cards" || !product) redirect("/account/entries?filter=completion");
  return <CheckoutGiftCardsPreview product={{ title: product.title, image: product.gallery[0].src }} />;
}
