import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FreeEntryPrintSheet } from "@/components/compliance/FreeEntryPrintCard";
import { freeEntryProduct } from "@/lib/catalog/shopping-catalog";
import { freeEntryHref, productBrowseReturnPath } from "@/lib/catalog/product-return";
import { parseEntryQuantity } from "@/lib/entries/quantity";
import { getAccountContext } from "@/lib/account/context";

export const metadata: Metadata = { title: "Print AMOE Entry Insert" };

type Props = {
  searchParams: Promise<{
    offering?: string | string[];
    share?: string | string[];
    from?: string | string[];
    quantity?: string | string[];
    name?: unknown;
    account?: unknown;
    reference?: unknown;
  }>;
};

export default async function PrintFreeEntryPage({ searchParams }: Props) {
  const params = await searchParams;
  if (!params.offering) redirect("/free-entry");
  if (Array.isArray(params.offering)) return <div className="mx-auto max-w-3xl p-6 text-white">
    <h1 className="text-2xl font-black">Choose one prize to print</h1>
    <p className="mt-3">This link includes more than one prize selection.</p>
    <Link className="mt-4 inline-block text-cyan-300 underline" href={productBrowseReturnPath(params.from) ?? "/browse#search-results"}>Back to prize selection</Link>
  </div>;
  const product = await freeEntryProduct(params.offering);
  if (product === undefined) {
    const instructions = freeEntryHref(params.offering ?? "", params.from, parseEntryQuantity(params.quantity), params.share);
    return <div className="mx-auto max-w-3xl p-6 text-white">
      <h1 className="text-2xl font-black">Availability temporarily unavailable</h1>
      <p className="mt-3">We couldn’t check this prize. Try again to open its print preview.</p>
      <Link className="mt-4 inline-block text-cyan-300 underline" prefetch={false} href={instructions.replace("/free-entry?", "/free-entry/print?")}>Try again</Link>
    </div>;
  }
  if (!product) redirect(freeEntryHref(params.offering, params.from, parseEntryQuantity(params.quantity), params.share));
  const quantity = params.offering === product.slug ? parseEntryQuantity(params.quantity) : null;
  const instructions = freeEntryHref(product.slug, params.from, quantity, params.offering === product.slug ? params.share : undefined);
  if (params.name !== undefined || params.account !== undefined || params.reference !== undefined) {
    redirect(`${instructions}#free-entry-intro`);
  }
  if (await getAccountContext()) redirect(`${instructions}#print-entry-insert`);
  return <FreeEntryPrintSheet offering={product.slug} title={product.title}
    name="LEGAL NAME NEEDED" account="DEMO ACCOUNT NEEDED" reference="ZL-DEMO001" blankSample
    back={<Link href={`${instructions}#free-entry-intro`} className="text-sm font-bold text-cyan-300 hover:text-white">← Back to entry instructions</Link>} />;
}
