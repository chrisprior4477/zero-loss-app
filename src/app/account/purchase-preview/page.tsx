import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Purchase walkthrough previews",
  robots: { index: false, follow: false },
};

export default function PurchasePreviewPage() {
  redirect("/account/entries?filter=completion");
}
