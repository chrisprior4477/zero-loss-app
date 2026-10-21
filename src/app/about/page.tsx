import type { Metadata } from "next";
import Link from "next/link";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <PlaceholderPage title="About">
      <Link
        href="/"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--live)] px-6 py-3 text-base font-bold text-[#061630] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live)]"
      >
        Continue shopping
      </Link>
    </PlaceholderPage>
  );
}
