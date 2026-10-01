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

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const account = await getAccountContext();
  const favorites = account ? await getFavoriteSnapshot(account.userId) : { slugs: [], available: true };
  return (
    <FavoritesProvider key={account?.userId ?? "guest"} initialSlugs={favorites.slugs} isSignedIn={Boolean(account)} available={favorites.available}>
    <div className="flex min-h-full flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:text-[var(--accent-foreground)]"
      >
        Skip to content
      </a>
      <SiteHeader />
      <Suspense fallback={null}><SiteBreadcrumbs /></Suspense>
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <InstallAppPrompt />
      <Suspense fallback={null}><PendingEntryNotice /></Suspense>
    </div>
    </FavoritesProvider>
  );
}
