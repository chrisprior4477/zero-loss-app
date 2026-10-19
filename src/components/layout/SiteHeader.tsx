import Link from "next/link";
import Image from "next/image";
import { ResponsiveSiteHeader } from "./ResponsiveSiteHeader";
import { AccountDrawer } from "@/components/layout/AccountDrawer";
import { HeaderAccountMetrics } from "@/components/layout/HeaderAccountMetrics";
import { getAccountContext } from "@/lib/account/context";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { availabilityStatus } from "@/lib/catalog/availability";
import { demoProducts } from "@/lib/catalog/demo-products";
import { productHrefWithBrowseReturn } from "@/lib/catalog/product-return";
import { resolvedCatalogSlugs } from "@/lib/catalog/demo-visibility";

export async function SiteHeader() {
  const [account, availability] = await Promise.all([getAccountContext(), getOfferingAvailability()]);
  const activityState = account?.activity ?? { isPreview: false, activity: [], activeCount: null, source: "unavailable" as const };
  const hiddenSlugs = resolvedCatalogSlugs(account?.activity);
  const resolved = new Set(hiddenSlugs);
  const endingSoonItems = demoProducts.filter(product => !resolved.has(product.slug)).map((product) => {
    const current = availability?.[product.slug];
    const status = availabilityStatus(current?.capacity ?? product.capacity, current?.sold ?? product.sold);
    return { product, status };
  }).filter(({ status }) => status.almostFull)
    .sort((a, b) => a.status.remaining - b.status.remaining)
    .slice(0, 12)
    .map(({ product, status }) => ({
      title: product.title,
      href: productHrefWithBrowseReturn(product.slug, "/browse?sort=ending-soon"),
      remaining: status.remaining,
    }));

  return <ResponsiveSiteHeader endingSoonItems={endingSoonItems} hiddenSlugs={hiddenSlugs}
      logo={<Link href="/" className="shrink-0" aria-label="ZeroLoss home">
          <Image
            src="/zeroloss-logo.svg"
            alt=""
            width={174}
            height={32}
            className="h-5 w-auto sm:h-[28px] lg:h-[32px]"
            priority
          />
        </Link>}
      metrics={<HeaderAccountMetrics isSignedIn={Boolean(account)} liveBalance={account?.balanceLabel ?? null} activityState={activityState} />}
      accountMenu={<AccountDrawer
            key={account?.userId ?? "signed-out"}
            isSignedIn={Boolean(account)}
            displayName={account?.displayName ?? "Welcome"}
            email={account?.email ?? null}
            avatarUrl={account?.avatarUrl ?? null}
            showPhotoInMenu={account?.showPhotoInMenu ?? true}
            balanceLabel={account?.balanceLabel ?? null}
            fundingEnabled={account?.fundingEnabled ?? false}
            activityState={activityState}
          />}
    />;
}
