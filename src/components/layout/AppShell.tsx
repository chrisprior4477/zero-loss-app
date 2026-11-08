import { getNotificationSnapshot } from "@/lib/account/notification-snapshot";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { ReturnToUpdates } from "@/components/notifications/HeaderNotifications";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { InstallAppPrompt } from "@/components/layout/InstallAppPrompt";
import { SiteBreadcrumbs } from "@/components/layout/SiteBreadcrumbs";
import { PendingEntryNotice } from "@/components/product/PendingEntryNotice";
import { FavoritesProvider } from "@/components/favorites/FavoritesProvider";
import { getAccountContext } from "@/lib/account/context";
import { getFavoriteSnapshot } from "@/lib/favorites/reader";
import { MenuLayoutProvider } from "./MenuLayoutProvider";
import { MenuLayoutTrialBar } from "./MenuLayoutTrialBar";
import { MobileLogoSizeProvider } from "./MobileLogoSizeProvider";
import { MobileLogoSizeTrialBar } from "./MobileLogoSizeTrialBar";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { TimeZoneProvider } from "@/components/account/TimeZoneProvider";
import { AccountStateSync } from "@/components/account/AccountStateSync";
import { ProductBreadcrumbTitleProvider } from "./ProductBreadcrumbTitle";

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const account = await getAccountContext();
  const [favorites, notifications] = await Promise.all([
    account ? getFavoriteSnapshot(account.userId) : Promise.resolve({ slugs: [], available: true }),
    account ? getNotificationSnapshot() : Promise.resolve(null),
  ]);
  return (
    <TimeZoneProvider value={account?.timezone ?? "America/New_York"}>
    <NotificationProvider key={account?.userId ?? "guest"} initial={notifications} initialPopupStyle={account?.notificationPopupStyle ?? "rounded"} initialSpeed={account?.notificationBannerSpeed ?? 5} initialDisplaySeconds={account?.notificationBannerDisplaySeconds ?? 6} initialEnabled={account?.headerNotificationsEnabled ?? true} initialStyle={account?.notificationBannerStyle ?? "capsule"}>
    <MobileLogoSizeProvider key={account?.userId ?? "guest"} accountId={account?.userId} initialSize={account?.mobileLogoSize ?? 0}>
    <MenuLayoutProvider key={account?.userId ?? "guest"} accountId={account?.userId} initialLayout={account?.menuLayout ?? "classic"} initialTabletLayout={account?.tabletMenuLayout ?? "classic"} initialDesktopLayout={account?.desktopMenuLayout ?? "classic"}>
    <FavoritesProvider initialSlugs={favorites.slugs} isSignedIn={Boolean(account)} available={favorites.available}>
    <ProductBreadcrumbTitleProvider><div className="flex min-h-full flex-col" style={{ paddingBottom: "max(var(--menu-trial-height, 0px), var(--logo-size-trial-height, 0px))" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:text-[var(--accent-foreground)]"
      >
        Skip to content
      </a>
      <SiteHeader />
      {account ? <AccountStateSync key={account.userId} accountId={account.userId} balanceCents={account.wallet?.balanceCents ?? null} activeCount={account.activity.activeCount}
        offerRevision={JSON.stringify(account.activity.activity.filter(item => item.completionOptionId)
          .map(item => [item.completionOptionId, item.completionOptionStatus, item.status]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))} /> : null}
      <Suspense fallback={null}><SiteBreadcrumbs /></Suspense>
      <Suspense fallback={null}><ReturnToUpdates /></Suspense>
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter demoSharing={isPreviewDataEnvironment() && account?.wallet?.scope === "demo"} />
      <InstallAppPrompt />
      {account ? <Suspense fallback={null}><PendingEntryNotice accountId={account.userId} /></Suspense> : null}
      <MenuLayoutTrialBar />
      <MobileLogoSizeTrialBar />
    </div></ProductBreadcrumbTitleProvider>
    </FavoritesProvider>
    </MenuLayoutProvider>
    </MobileLogoSizeProvider>
    </NotificationProvider>
    </TimeZoneProvider>
  );
}
