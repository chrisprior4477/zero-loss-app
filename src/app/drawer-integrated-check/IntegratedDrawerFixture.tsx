"use client";

import { useEffect } from "react";
import { AccountDrawer } from "@/components/layout/AccountDrawer";
import type { AccountActivity } from "@/lib/account/activity";

const activityState: AccountActivity = {
  isPreview: false,
  activeCount: 8,
  source: "stored",
  activity: [
    { slug: "drawer-visual-check", status: "prize", title: "Visual check reward", retailer: "Zero Loss", image: "/ps5.png", rewardKind: "digital", priceCents: 10000, paidCents: 100, remainingCents: 9900, availability: "Ready" },
  ],
};

export function IntegratedDrawerFixture() {
  useEffect(() => {
    const frame = requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('#drawer-integrated-fixture button[aria-label="Open account menu"]')?.click());
    return () => cancelAnimationFrame(frame);
  }, []);

  return <div id="drawer-integrated-fixture"><AccountDrawer isSignedIn displayName="Chris Prior" email="drawer-check@example.test" avatarUrl={null} balanceLabel="$193" fundingEnabled activityState={activityState} /></div>;
}
