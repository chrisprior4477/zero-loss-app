import Link from "next/link";
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
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
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

      <PageContainer>
        <section className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(160deg,var(--surface-elevated)_0%,var(--surface)_55%,var(--background)_100%)] px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--accent)]">
            ZeroLoss
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Shop with confidence. Keep the excitement.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            Homepage shell is in place. Catalog browsing, wallet funding, and
            participation flows will connect here as the first vertical slice
            lands.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="inline-flex cursor-not-allowed rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)] opacity-70">
              Browse products · Coming soon
            </span>
            <Link
              href="/how-it-works"
              className="inline-flex rounded-md border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)]"
            >
              How it works
            </Link>
          </div>
        </section>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
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
