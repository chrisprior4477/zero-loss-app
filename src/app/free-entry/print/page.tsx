import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FreeEntryPrintSheet } from "@/components/compliance/FreeEntryPrintCard";
import { freeEntryProduct } from "@/lib/catalog/shopping-catalog";
import { freeEntryHref } from "@/lib/catalog/product-return";
import { parseEntryQuantity } from "@/lib/entries/quantity";

export const metadata: Metadata = { title: "Print AMOE Entry Insert" };

type Props = {
  searchParams: Promise<{
    offering?: string;
    from?: string | string[];
    quantity?: string | string[];
    name?: unknown;
    account?: unknown;
    reference?: unknown;
  }>;
};

export default async function PrintFreeEntryPage({ searchParams }: Props) {
  const params = await searchParams;
  const product = await freeEntryProduct(params.offering);
  if (!product) redirect("/browse");
  const quantity = params.offering === product.slug ? parseEntryQuantity(params.quantity) : null;
  const instructions = freeEntryHref(product.slug, params.from, quantity);
  if (params.name !== undefined || params.account !== undefined || params.reference !== undefined) redirect(instructions);
  return <FreeEntryPrintSheet offering={product.slug} title={product.title}
    name="LEGAL NAME NEEDED" account="DEMO ACCOUNT NEEDED" reference="ZL-DEMO001"
    back={<Link href={instructions} className="text-sm font-bold text-cyan-300 hover:text-white">← Back to entry instructions</Link>} />;
}
