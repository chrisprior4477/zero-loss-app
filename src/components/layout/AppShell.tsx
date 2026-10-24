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

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const account = await getAccountContext();
  const favorites = account ? await getFavoriteSnapshot(account.userId) : { slugs: [], available: true };
  const notifications = account ? await getNotificationSnapshot() : null;
  return (
    <NotificationProvider key={account?.userId ?? "guest"} initial={notifications} initialSpeed={account?.notificationBannerSpeed ?? 5} initialEnabled={account?.headerNotificationsEnabled ?? true} initialStyle={account?.notificationBannerStyle ?? "capsule"}>
    <MobileLogoSizeProvider key={account?.userId ?? "guest"} accountId={account?.userId} initialSize={account?.mobileLogoSize ?? 0}>
    <MenuLayoutProvider key={account?.userId ?? "guest"} accountId={account?.userId} initialLayout={account?.menuLayout ?? "classic"} initialTabletLayout={account?.tabletMenuLayout ?? "classic"} initialDesktopLayout={account?.desktopMenuLayout ?? "classic"}>
    <FavoritesProvider initialSlugs={favorites.slugs} isSignedIn={Boolean(account)} available={favorites.available}>
    <div className="flex min-h-full flex-col" style={{ paddingBottom: "max(var(--menu-trial-height, 0px), var(--logo-size-trial-height, 0px))" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:text-[var(--accent-foreground)]"
      >
        Skip to content
      </a>
      <SiteHeader />
      <Suspense fallback={null}><SiteBreadcrumbs /></Suspense>
      <Suspense fallback={null}><ReturnToUpdates /></Suspense>
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <InstallAppPrompt />
      {account ? <Suspense fallback={null}><PendingEntryNotice accountId={account.userId} /></Suspense> : null}
      <MenuLayoutTrialBar />
      <MobileLogoSizeTrialBar />
    </div>
    </FavoritesProvider>
    </MenuLayoutProvider>
    </MobileLogoSizeProvider>
    </NotificationProvider>
  );
}
