import { CategoryNav } from "@/components/home/CategoryNav";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { HeroBannerCarousel } from "@/components/home/HeroBannerCarousel";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeSection } from "@/components/home/HomeSection";
import { LiveActivityFeed } from "@/components/home/LiveActivityFeed";
import { ProductDiscoveryGrid } from "@/components/home/ProductDiscoveryGrid";
import { TrustSection } from "@/components/home/TrustSection";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  placeholderDiscoveryProducts,
  placeholderFeaturedProducts,
} from "@/lib/home/placeholder-data";

/**
 * Homepage composition (spec §4 layout structure).
 *
 * Order: sticky header (AppShell) → category nav → hero → carousel →
 * live activity → featured → discovery grid → trust → footer (AppShell).
 *
 * This stays a Server Component and performs NO data access. Product values
 * come from `@/lib/home/placeholder-data` and the activity feed is
 * deliberately empty (spec §10 prohibits fabricated activity). Wallet and
 * identity remain owned by SiteHeader — nothing here reads the ledger or the
 * session (spec §32).
 */
export default function HomePage() {
  return (
    <>
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <PageContainer className="py-3 sm:py-3">
          <CategoryNav />
        </PageContainer>
      </div>

      <PageContainer className="pb-6 pt-5 sm:pb-8 sm:pt-6">
        <HeroSection />

        <div className="mt-4 sm:mt-5">
          <HeroBannerCarousel />
        </div>
      </PageContainer>

      <PageContainer className="space-y-10 pt-2 sm:space-y-12">
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
          <FeaturedProducts products={placeholderFeaturedProducts} />
        </HomeSection>

        <HomeSection
          id="discovery"
          title="Browse the marketplace"
          description="Everyday items you were probably buying anyway."
        >
          <ProductDiscoveryGrid products={placeholderDiscoveryProducts} />
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
