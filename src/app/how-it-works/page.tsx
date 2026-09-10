import type { Metadata } from "next";
import Image from "next/image";
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
        <div className="mt-8 overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#00132e] shadow-[0_18px_42px_rgba(0,0,0,0.32)]">
          <Image
            src="/perfect-zero-loss-four-card-v3.png"
            alt="Four-step ZeroLoss walkthrough: choose a prize, try for one dollar, win the prize, or use the dollar toward buying the same product."
            width={1774}
            height={887}
            sizes="(min-width: 1280px) 1152px, (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)"
            className="h-auto w-full"
            priority
          />
        </div>
      </section>
    </PageContainer>
  );
}
