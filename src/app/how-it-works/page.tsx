import type { Metadata } from "next";
import { MechanismStory } from "@/components/home/MechanismStory";
import { PageContainer } from "@/components/layout/PageContainer";

export const metadata: Metadata = {
  title: "How It Works",
};

export default function HowItWorksPage() {
  return (
    <PageContainer className="pt-3 sm:pt-4">
      <section aria-labelledby="how-it-works-heading">
        <h1
          id="how-it-works-heading"
          className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl"
        >
          How It Works
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          Shopping should never feel like losing. Here&apos;s the whole model in
          three steps.
        </p>
        <div className="mt-8">
          <MechanismStory />
        </div>
      </section>
    </PageContainer>
  );
}
