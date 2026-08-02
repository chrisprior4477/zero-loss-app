import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "How It Works",
};

export default function HowItWorksPage() {
  return (
    <PlaceholderPage
      title="How It Works"
      description="The trust and education experience will be built here from the How It Works product specification."
    />
  );
}
