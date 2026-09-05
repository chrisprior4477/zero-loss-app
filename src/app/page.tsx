import { CategoryNav } from "@/components/home/CategoryNav";
import { DesktopMarketplaceRails } from "@/components/home/DesktopMarketplaceRails";
import { DollarWall } from "@/components/home/DollarWall";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeSection } from "@/components/home/HomeSection";
import { LivePulseTicker } from "@/components/home/LivePulseTicker";
import { ShopByPrice } from "@/components/home/ShopByPrice";
import { TransparencyStatsPod } from "@/components/home/TransparencyStatsPod";
import { PageContainer } from "@/components/layout/PageContainer";

/**
 * Homepage composition (spec §4), following the Checkpoint 2 artboards with
 * the C1-C10 review decisions applied.
 *
 * Order: sticky header (AppShell) → category nav → hero → desktop marketplace
 * rails → transparency → marketplace activity → status cards → price browsing
 * → trust → footer (AppShell).
 *
 * This stays a Server Component and performs NO data access. Values come from
 * `@/lib/home/placeholder-data`; wallet and identity remain owned by
 * SiteHeader, the single place that reads the ledger (spec §32).
 */
export default function HomePage() {
  return (
    <>
      <CategoryNav />
      <LivePulseTicker />

      <PageContainer className="pb-10 pt-8 sm:pb-12 sm:pt-10 lg:pt-0">
        <HeroSection />
        <DesktopMarketplaceRails />
      </PageContainer>

      <PageContainer className="space-y-14 pb-16 pt-0 sm:space-y-16">
        <DollarWall />

        <HomeSection id="shop-by-price" title="Shop by price" description="Find rewards in your price range.">
          <ShopByPrice />
        </HomeSection>

      </PageContainer>
      <TransparencyStatsPod />
    </>
  );
}
