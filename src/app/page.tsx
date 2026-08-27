import { CategoryNav } from "@/components/home/CategoryNav";
import { CreditBanner } from "@/components/home/CreditBanner";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeSection } from "@/components/home/HomeSection";
import { LiveActivityFeed } from "@/components/home/LiveActivityFeed";
import { ProductDiscoveryGrid } from "@/components/home/ProductDiscoveryGrid";
import { PromoTileCarousel } from "@/components/home/PromoTileCarousel";
import { ShopByPrice } from "@/components/home/ShopByPrice";
import { TrustSection } from "@/components/home/TrustSection";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  placeholderDiscoveryOpportunities,
  placeholderFeaturedOpportunities,
  placeholderRebateCreditAmount,
} from "@/lib/home/placeholder-data";

/**
 * Homepage composition (spec §4), following the Checkpoint 2 artboards with
 * the C1-C10 review decisions applied.
 *
 * Order: sticky header (AppShell) → category nav → hero → promo rail →
 * live activity → featured → discovery grid → credit banner → shop by price →
 * trust → footer (AppShell).
 *
 * The artboard's stats bar is deliberately absent (C9), and its winner ticker
 * of fabricated names is not built — the activity feed ships empty (C3, and
 * spec §10, which prohibits fabricated activity outright).
 *
 * This stays a Server Component and performs NO data access. Values come from
 * `@/lib/home/placeholder-data`; wallet and identity remain owned by
 * SiteHeader, the single place that reads the ledger (spec §32).
 */
export default function HomePage() {
  return (
    <>
      <CategoryNav />

      <PageContainer className="pb-10 pt-8 sm:pb-12 sm:pt-10">
        <HeroSection />

        <div className="mt-12">
          <PromoTileCarousel />
        </div>
      </PageContainer>

      <PageContainer className="space-y-14 pb-16 pt-0 sm:space-y-16">
        <HomeSection
          id="live-activity"
          title="Live marketplace activity"
          description="What's happening on the platform right now."
        >
          <LiveActivityFeed items={[]} />
        </HomeSection>

        <HomeSection
          id="featured"
          title="Featured opportunities"
          description="A rotating selection of pools worth a look."
        >
          <FeaturedProducts opportunities={placeholderFeaturedOpportunities} />
        </HomeSection>

        <HomeSection
          id="discovery"
          title="Browse the marketplace"
          description="Everyday items you were probably buying anyway."
        >
          <ProductDiscoveryGrid
            opportunities={placeholderDiscoveryOpportunities}
          />
        </HomeSection>

        <CreditBanner
          amount={placeholderRebateCreditAmount}
          isDevelopmentPlaceholder
        />

        <HomeSection id="shop-by-price" title="Shop by price">
          <ShopByPrice />
        </HomeSection>

        <HomeSection
          id="trust"
          title="Built to be worth trusting"
          description="How your participation is protected."
        >
          <TrustSection />
        </HomeSection>
      </PageContainer>
    </>
  );
}
