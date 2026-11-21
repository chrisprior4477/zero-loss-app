import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FreeEntryPrintSheet } from "@/components/compliance/FreeEntryPrintCard";
import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import { freeEntryChoices, freeEntryProduct } from "@/lib/catalog/shopping-catalog";
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
  if (Array.isArray(params.offering)) {
    const choices = await freeEntryChoices(params.offering, params.share);
    return <div className="mx-auto max-w-3xl p-6 text-white">
    <AccountSettingsLandingScroll target="free-entry-choices" initialTarget="free-entry-choices" focusTarget="free-entry-choices" allScreens />
    <h1 id="free-entry-choices" tabIndex={-1} className="text-2xl font-black">{choices.length ? "Choose one prize to print" : "The selected prizes are unavailable"}</h1>
    <p className="mt-3">{choices.length ? "This link includes more than one prize selection." : "Return to prize selection to choose an open offering."}</p>
    {choices.length > 0 && choices.length < new Set(params.offering.map(value => value.toLowerCase())).size ? <p role="status" className="mt-3">Some of the selected prizes are unavailable. Choose an open prize below.</p> : null}
    {choices.length > 0 && <ul className="mt-4 space-y-2">{choices.map(({ product, share }) => <li key={product.slug}><Link className="text-cyan-300 underline" href={freeEntryHref(product.slug, params.from, parseEntryQuantity(params.quantity), share).replace("/free-entry?", "/free-entry/print?") + (params.quantity !== undefined && parseEntryQuantity(params.quantity) === null ? "&quantity=invalid" : "")}>{product.title}</Link></li>)}</ul>}
    <Link className="mt-4 inline-block text-cyan-300 underline" href={productBrowseReturnPath(params.from) ?? "/browse#search-results"}>Back to prize selection</Link>
    </div>;
  }
  const offering = params.offering.toLowerCase();
  const product = await freeEntryProduct(offering);
  if (product === undefined) {
    const parsed = parseEntryQuantity(params.quantity);
    const instructions = freeEntryHref(offering, params.from, parsed, params.share)
      + (params.quantity !== undefined && parsed === null ? "&quantity=invalid" : "");
    return <div className="mx-auto max-w-3xl p-6 text-white">
      <h1 className="text-2xl font-black">Availability temporarily unavailable</h1>
      <p className="mt-3">We couldn’t check this prize. Try again to open its print preview.</p>
      <Link className="mt-4 inline-block text-cyan-300 underline" prefetch={false} href={instructions.replace("/free-entry?", "/free-entry/print?")}>Try again</Link>
    </div>;
  }
  if (!product) {
    const parsed = parseEntryQuantity(params.quantity);
    redirect(freeEntryHref(offering, params.from, parsed, params.share)
      + (params.quantity !== undefined && parsed === null ? "&quantity=invalid" : ""));
  }
  const quantity = parseEntryQuantity(params.quantity);
  const instructions = freeEntryHref(product.slug, params.from, quantity, params.share);
  if (params.quantity !== undefined && quantity === null) redirect(`${instructions}&quantity=invalid#free-entry-intro`);
  if (params.name !== undefined || params.account !== undefined || params.reference !== undefined) {
    redirect(`${instructions}#free-entry-intro`);
  }
  if (await getAccountContext()) redirect(`${instructions}#print-entry-insert`);
  return <FreeEntryPrintSheet offering={product.slug} title={product.title}
    name="LEGAL NAME NEEDED" account="DEMO ACCOUNT NEEDED" reference="ZL-DEMO001" blankSample
    back={<Link href={`${instructions}#free-entry-intro`} className="text-sm font-bold text-cyan-300 hover:text-white">← Back to entry instructions</Link>} />;
}
