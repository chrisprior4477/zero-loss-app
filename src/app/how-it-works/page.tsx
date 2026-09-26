import type { Metadata } from "next";
import { HowItWorksExplainer } from "@/components/home/HowItWorksExplainer";
import { PageContainer } from "@/components/layout/PageContainer";

export const metadata: Metadata = {
  title: "How It Works",
};

export default function HowItWorksPage() {
  return (
    <PageContainer wide className="pt-3 sm:pt-4">
      <section aria-labelledby="how-it-works-heading">
        <h1
          id="how-it-works-heading"
          className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl"
        >
          How It Works
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          From your $1 entry to your retailer gift-card options, here are the five steps.
        </p>
        <div className="mt-8 rounded-2xl border border-cyan-300/20 bg-[#00132e] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.32)] sm:p-6">
          <HowItWorksExplainer />
        </div>
      </section>
    </PageContainer>
  );
}
