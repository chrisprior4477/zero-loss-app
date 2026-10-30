import { DesktopMarketplaceRails } from "@/components/home/DesktopMarketplaceRails";
import { CrewAndWinnerPreview } from "@/components/home/CrewAndWinnerPreview";
import { DollarWall } from "@/components/home/DollarWall";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeSection } from "@/components/home/HomeSection";
import { LivePulseTicker } from "@/components/home/LivePulseTicker";
import { ShopByPrice } from "@/components/home/ShopByPrice";
import { TransparencyStatsPod } from "@/components/home/TransparencyStatsPod";
import { PageContainer } from "@/components/layout/PageContainer";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { OfferingAvailabilityProvider } from "@/components/home/OfferingAvailabilityProvider";
import { ContinueEntryBanner } from "@/components/home/ContinueEntryBanner";
import { ShoppingReminderPreview } from "@/components/home/ShoppingReminderPreview";
import { demoProducts } from "@/lib/catalog/demo-products";
import { getAccountContext } from "@/lib/account/context";
import { resolvedCatalogSlugs } from "@/lib/catalog/demo-visibility";
import { livePulseItems } from "@/lib/home/live-pulse";

/**
 * Homepage composition (spec §4), following the Checkpoint 2 artboards with
 * the C1-C10 review decisions applied.
 *
 * Order: sticky header (AppShell) → category nav → hero → desktop marketplace
 * rails → transparency → marketplace activity → status cards → price browsing
 * → trust → footer (AppShell).
 *
 * Sample artwork/content stays intact; only aggregate offering availability
 * comes from the database. No customer or ledger records enter the rail props.
 */
export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [availability, account, params] = await Promise.all([getOfferingAvailability(), getAccountContext(), searchParams]);
  const reminderVariant = params["reminder-preview"];
  const previewProduct = reminderVariant === "viewed" || reminderVariant === "entry"
    ? demoProducts.find(product => product.slug === "playstation-5-slim") : undefined;
  const reminderPreview = previewProduct && (reminderVariant === "viewed" || reminderVariant === "entry")
    ? <ShoppingReminderPreview key={reminderVariant} variant={reminderVariant} product={{ slug: previewProduct.slug, title: previewProduct.title, image: previewProduct.gallery[0].src }} /> : null;
  return (
    <>
      {reminderPreview ?? <ContinueEntryBanner products={demoProducts
        .filter(product => !resolvedCatalogSlugs(account?.activity).includes(product.slug)
          && (availability?.[product.slug]?.remaining !== 0 || availability?.[product.slug]?.repeatableScenario))
        .map(product => ({ slug: product.slug, title: product.title, image: product.gallery[0].src }))} />}
      <LivePulseTicker items={livePulseItems(availability, account?.activity)} />

      <PageContainer className="pb-0 pt-0 sm:pb-12 sm:pt-0 md:pb-4">
        <HeroSection />
        <OfferingAvailabilityProvider snapshot={availability} resolvedSlugs={resolvedCatalogSlugs(account?.activity)}>
          <DesktopMarketplaceRails />
        </OfferingAvailabilityProvider>
      </PageContainer>

      <PageContainer wide className="space-y-3 pb-3 pt-0 sm:space-y-16 sm:pb-16 md:space-y-4 md:pb-4">
        <DollarWall />

        <HomeSection id="shop-by-price" title="Shop by price" description="Find rewards in your price range.">
          <ShopByPrice />
        </HomeSection>

        <CrewAndWinnerPreview />

      </PageContainer>
      <TransparencyStatsPod />
    </>
  );
}
