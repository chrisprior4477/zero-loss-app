import Link from "next/link";
import Image from "next/image";
import { ResponsiveSiteHeader } from "./ResponsiveSiteHeader";
import { AccountDrawer } from "@/components/layout/AccountDrawer";
import { HeaderAccountMetrics } from "@/components/layout/HeaderAccountMetrics";
import { getShoppingCatalog } from "@/lib/catalog/shopping-catalog";
import { availabilityStatus } from "@/lib/catalog/availability";
import { demoProducts } from "@/lib/catalog/demo-products";
import { productHrefWithBrowseReturn } from "@/lib/catalog/product-return";
import { marketplaceCategoryHref, marketplaceCategoryId, productMatchesMarketplaceCategory } from "@/lib/catalog/navigation";
import { filterCatalogSubcategory } from "@/lib/catalog/search";
import { categorySubcategories } from "@/lib/home/placeholder-data";

function indexDepartmentTopics() {
  return Object.entries(categorySubcategories).flatMap(([department, topics]) => {
    const category = marketplaceCategoryId(department);
    if (!category || category === "ending-soon") return [];
    const catalog = demoProducts.filter(product => productMatchesMarketplaceCategory(product, category));
    return topics.map(topic => ({
      href: marketplaceCategoryHref(department, topic),
      matchingSlugs: filterCatalogSubcategory(catalog, topic).map(product => product.slug),
    }));
  });
}
let departmentTopics: ReturnType<typeof indexDepartmentTopics> | undefined;

export async function SiteHeader() {
  const { account, availability, hidden, unavailable } = await getShoppingCatalog();
  const activityState = account?.activity ?? { isPreview: false, activity: [], activeCount: null, source: "unavailable" as const };
  const endingSoonItems = demoProducts.filter(product => !hidden.has(product.slug)).map((product) => {
    const current = availability?.[product.slug];
    const status = availabilityStatus(current?.capacity ?? product.capacity, current?.sold ?? product.sold);
    return { product, status };
  }).filter(({ status }) => status.almostFull)
    .sort((a, b) => a.status.remaining - b.status.remaining)
    .slice(0, 12)
    .map(({ product, status }) => ({
      title: product.title,
      href: productHrefWithBrowseReturn(product.slug, `/browse?sort=ending-soon#prize-${product.slug}`),
      remaining: status.remaining,
    }));

  const unavailableTopics = unavailable ? [] : (departmentTopics ??= indexDepartmentTopics())
    .filter(topic => topic.matchingSlugs.every(slug => hidden.has(slug))).map(topic => topic.href);
  return <ResponsiveSiteHeader endingSoonItems={endingSoonItems} hiddenSlugs={[...hidden]} unavailableTopics={unavailableTopics}
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
            ownerId={account?.userId}
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
