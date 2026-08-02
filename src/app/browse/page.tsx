import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Browse",
};

export default function BrowsePage() {
  return (
    <PlaceholderPage
      title="Browse"
      description="Product and pool discovery will live here once catalog browsing is implemented."
    />
  );
}
