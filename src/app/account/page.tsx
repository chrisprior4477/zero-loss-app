import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "My Activity" };

/**
 * `/account` is retained as a compatibility route for saved links.
 * The retired account dashboard now resolves to the current My Activity page.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string | string[]; filter?: string | string[] }>;
}) {
  const query = await searchParams;
  const destination = new URLSearchParams();
  if (typeof query.item === "string") destination.set("item", query.item);
  if (typeof query.filter === "string") destination.set("filter", query.filter);
  const suffix = destination.size ? `?${destination}` : "";
  redirect(`/account/entries${suffix}`);
}
