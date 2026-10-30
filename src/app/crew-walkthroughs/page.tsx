import type { Metadata } from "next";
import { CrewSharingWalkthroughs } from "@/components/preview/CrewSharingWalkthroughs";
import { isSharingJourney } from "@/components/preview/crew-walkthrough-model";

export const metadata: Metadata = {
  title: "Crew sharing walkthroughs",
  robots: { index: false, follow: false },
};

export default async function CrewWalkthroughsPage({ searchParams }: {
  searchParams: Promise<{ journey?: string }>;
}) {
  const { journey } = await searchParams;
  return <CrewSharingWalkthroughs key={journey ?? "overview"} initialJourney={isSharingJourney(journey) ? journey : null} />;
}
