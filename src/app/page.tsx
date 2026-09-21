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
export default async function HomePage() {
  const availability = await getOfferingAvailability();
  return (
    <>
      <LivePulseTicker />

      <PageContainer className="pb-0 pt-0 sm:pb-12 sm:pt-0 md:pb-4">
        <HeroSection />
        <OfferingAvailabilityProvider snapshot={availability}>
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
