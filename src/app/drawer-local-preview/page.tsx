import { AccountDrawer } from "@/components/layout/AccountDrawer";
import type { AccountActivity } from "@/lib/account/activity";
import { notFound } from "next/navigation";

const activityState: AccountActivity = {
  isPreview: true,
  source: "stored",
  activeCount: 8,
  activity: [
    {
      slug: "gift-1", title: "Local visual fixture", retailer: "Demo", image: "",
      status: "prize", rewardKind: "digital", priceCents: 2500,
      paidCents: 100, remainingCents: 2400, availability: "Ready",
    },
  ],
};

export default async function DrawerLocalPreview({ searchParams }: {
  searchParams: Promise<{ capture?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  return <main style={{ minHeight: "100vh", background: "#071528" }}>
    {params.capture === "1" ? <style>{"nextjs-portal { display: none !important; }"}</style> : null}
    <AccountDrawer
      isSignedIn displayName="Chris Prior" email={null} avatarUrl={null}
      balanceLabel="$193" fundingEnabled activityState={activityState}
      autoOpenForLocalFixture
    />
  </main>;
}
