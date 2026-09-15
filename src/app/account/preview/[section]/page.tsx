import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canAccessInvestorPreview } from "@/lib/demo/access";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  accountPreviewDestinations,
  isAccountPreviewSlug,
} from "@/lib/demo/account-drawer";

export const metadata: Metadata = {
  title: "Account Preview",
};

export function generateStaticParams() {
  return Object.keys(accountPreviewDestinations).map((section) => ({ section }));
}

export default async function AccountPreviewPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  // Check at the page as well as its layout: layouts may be reused on navigation.
  if (!(await canAccessInvestorPreview())) redirect("/login");
  if (!isAccountPreviewSlug(section)) notFound();

  const destination = accountPreviewDestinations[section];

  return (
    <PageContainer>
      <section className="mx-auto max-w-xl" aria-labelledby="preview-heading">
        <div className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-cyan-200">
          Interactive MVP Preview
        </div>
        <p className="mt-6 text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Account
        </p>
        <h1 id="preview-heading" className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          {destination.title}
        </h1>
        <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-[var(--surface)] p-6">
          <p className="text-sm font-bold text-cyan-200">In development</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {destination.description}
          </p>
        </div>
        <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-cyan-300 underline-offset-4 hover:underline">
          Return to the marketplace
        </Link>
        <p className="mt-4 text-sm text-[var(--muted)]">The current preview now uses the shared customer pages. <Link href={section === "official-rules" ? "/free-entry" : section === "results" ? "/account/entries" : `/account/${section}`} className="font-bold text-cyan-300 hover:underline">Open the shared destination ›</Link></p>
      </section>
    </PageContainer>
  );
}
