import { NotificationBannerPicker } from "@/components/account/NotificationBannerPicker";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfilePhotoCard } from "@/components/account/ProfilePhotoCard";
import { ProfileDetailsForm } from "@/components/account/ProfileDetailsForm";
import { MenuLayoutPicker } from "@/components/account/MenuLayoutPicker";
import { MobileLogoSizePicker } from "@/components/account/MobileLogoSizePicker";
import { AccountSettingsFrame } from "@/components/account/AccountSettingsFrame";
import { getAccountContext } from "@/lib/account/context";
import styles from "@/components/account/account-settings-pages.module.css";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { demoProducts } from "@/lib/catalog/demo-products";
import { searchCatalog } from "@/lib/catalog/search";
import { resolvedCatalogSlugs } from "@/lib/catalog/demo-visibility";
import { searchExamples } from "@/lib/navigation/search-examples";
import { productMatchesMarketplaceCategory } from "@/lib/catalog/navigation";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", "/account/profile"));
  const hidden = new Set(resolvedCatalogSlugs(account.activity));
  const catalog = demoProducts.filter(product => !hidden.has(product.slug));
  const previewSearchResults = Object.fromEntries(searchExamples.map(query => [query.toLowerCase(), searchCatalog(catalog, query).map(product => ({ title: product.title, image: product.gallery[0].src }))]));
  previewSearchResults["@ending-soon"] = catalog.filter(product => productMatchesMarketplaceCategory(product, "ending-soon")).sort((a, b) => (a.capacity - a.sold) - (b.capacity - b.sold)).map(product => ({ title: product.title, image: product.gallery[0].src }));
  previewSearchResults["@browse"] = catalog.map(product => ({ title: product.title, image: product.gallery[0].src }));
  return <AccountSettingsFrame active="profile" overview={{ balanceLabel: account.balanceLabel, fundingEnabled: account.fundingEnabled, activity: account.activity }}>
    <section id="profile-intro" className={styles.introTicket} aria-labelledby="profile-heading">
      <div><span className={styles.eyebrow}>PERSONAL PROFILE</span><h2 id="profile-heading">Profile</h2><p>Manage your identity, contact details, address, and preferences. Changes save only to your signed-in account.</p></div>
      <div className={styles.profileCard}><ProfilePhotoCard initials={account.initials} fullName={account.displayName} email={account.email ?? "—"} initialAvatarUrl={account.avatarUrl} initialVisibility={{ menu: account.showPhotoInMenu, crew: account.showPhotoToCrew }} compact emailStatus={account.emailConfirmed ? "verified" : "pending"} /></div>
    </section>
    <MenuLayoutPicker previewSearchResults={previewSearchResults} previewAccount={{ count: account.activity.activeCount, balance: account.balanceLabel, avatarUrl: account.avatarUrl, showPhoto: account.showPhotoInMenu }} />
    <MobileLogoSizePicker />
    <NotificationBannerPicker initialSpeed={account.notificationBannerSpeed} initialEnabled={account.headerNotificationsEnabled} initialStyle={account.notificationBannerStyle} />
    <ProfileDetailsForm ticket details={{
        displayName: account.displayName,
        legalFirstName: account.legalFirstName,
        legalLastName: account.legalLastName,
        dateOfBirth: account.dateOfBirth,
        email: account.email,
        emailConfirmed: account.emailConfirmed,
        phone: account.phone,
        addressLine1: account.addressLine1,
        addressLine2: account.addressLine2,
        city: account.city,
        region: account.region,
        postalCode: account.postalCode,
        country: account.country,
        preferredLocale: account.preferredLocale,
        timezone: account.timezone,
      }} />
  </AccountSettingsFrame>;
}
