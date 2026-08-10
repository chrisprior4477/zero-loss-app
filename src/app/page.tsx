import { HomeHero } from "@/components/home/HomeHero";
import { PageContainer } from "@/components/layout/PageContainer";

const categories = [
  "All",
  "Groceries & Gas",
  "Movie Night",
  "Electronics",
  "Home Essentials",
  "Gift Cards",
  "Trophy Vault",
];

const skeletonSections = [
  {
    title: "Live marketplace activity",
    body: "Live ticker and recent participation will appear here once marketplace data is connected.",
  },
  {
    title: "Featured products",
    body: "Featured product highlights will land in this section in a later release.",
  },
  {
    title: "Product discovery",
    body: "The discovery grid will surface catalog items once catalog browsing is implemented.",
  },
  {
    title: "Trust & transparency",
    body: "Trust messaging and transparency modules will reinforce the ZeroLoss promise here.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Tight top padding so the story starts immediately under the nav */}
      <PageContainer className="pb-6 pt-3 sm:pb-8 sm:pt-4">
        <HomeHero />
      </PageContainer>

      <div className="border-y border-[var(--border)] bg-[var(--surface)]">
        <PageContainer className="py-3 sm:py-3">
          <nav aria-label="Categories">
            <ul className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((category, index) => (
                <li key={category} className="shrink-0">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${
                      index === 0
                        ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--foreground)]"
                        : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {category}
                  </span>
                </li>
              ))}
            </ul>
          </nav>
        </PageContainer>
      </div>

      <PageContainer className="pt-6 sm:pt-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {skeletonSections.map((section) => (
            <section
              key={section.title}
              className="rounded-xl border border-dashed border-[var(--section-line)] bg-[var(--surface)]/60 p-5"
            >
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </PageContainer>
    </>
  );
}
