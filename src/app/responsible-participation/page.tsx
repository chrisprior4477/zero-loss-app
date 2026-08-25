import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = {
  title: "Responsible Participation",
};

export default function ResponsibleParticipationPage() {
  return (
    <PlaceholderPage
      title="Responsible Participation"
      description="Guidance on participating thoughtfully — spending limits, self-exclusion tools, and support resources — will live here in a later release."
    />
  );
}
