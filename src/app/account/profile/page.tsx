import { NotificationBannerPicker } from "@/components/account/NotificationBannerPicker";
import { PreferenceSnapshot } from "@/components/account/PreferenceSnapshot";
import { accountLanguage } from "@/lib/account/locale";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfilePhotoCard } from "@/components/account/ProfilePhotoCard";
import { ProfileDetailsForm } from "@/components/account/ProfileDetailsForm";
import { ProfileReadBoundary } from "@/components/account/ProfileReadBoundary";
import { MenuLayoutPicker } from "@/components/account/MenuLayoutPicker";
import { MobileLogoSizePicker } from "@/components/account/MobileLogoSizePicker";
import { AccountSettingsFrame } from "@/components/account/AccountSettingsFrame";
import { getShoppingCatalog } from "@/lib/catalog/shopping-catalog";
import styles from "@/components/account/account-settings-pages.module.css";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { demoProducts } from "@/lib/catalog/demo-products";
import { searchCatalog } from "@/lib/catalog/search";
import { searchExamples } from "@/lib/navigation/search-examples";
import { productMatchesMarketplaceCategory } from "@/lib/catalog/navigation";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { account, hidden, availability } = await getShoppingCatalog();
  if (!account) redirect(authNavigationHref("/login", "/account/profile"));
  const t = accountLanguage(account.preferredLocale);
  const overview = { balanceLabel: account.balanceLabel, fundingEnabled: account.fundingEnabled, activity: account.activity };
  if (!account.profileSavedFields) {
    return <AccountSettingsFrame active="profile" locale={account.preferredLocale} overview={overview}><ProfileReadBoundary key={account.userId}>{null}</ProfileReadBoundary></AccountSettingsFrame>;
  }
  const catalog = demoProducts.filter(product => !hidden.has(product.slug)).map(product => {
    const current = availability?.[product.slug];
    return current ? { ...product, capacity: current.capacity, sold: current.sold } : product;
  });
  const previewSearchResults = Object.fromEntries(searchExamples.map(query => [query.toLowerCase(), searchCatalog(catalog, query).map(product => ({ title: product.title, image: product.gallery[0].src }))]));
  previewSearchResults["@ending-soon"] = catalog.filter(product => productMatchesMarketplaceCategory(product, "ending-soon")).sort((a, b) => (a.capacity - a.sold) - (b.capacity - b.sold)).map(product => ({ title: product.title, image: product.gallery[0].src }));
  previewSearchResults["@browse"] = catalog.map(product => ({ title: product.title, image: product.gallery[0].src }));
  return <AccountSettingsFrame active="profile" locale={account.preferredLocale} overview={overview}>
    <ProfileReadBoundary key={account.userId}>
    <section id="profile-intro" className={styles.introTicket} aria-labelledby="profile-heading">
      <div><span className={styles.eyebrow}>{t("PERSONAL PROFILE", "PERFIL PERSONAL")}</span><h2 id="profile-heading">{t("Profile", "Perfil")}</h2><p>{t("Manage your identity, contact details, address, and preferences. Changes save only to your signed-in account.", "Administra tu identidad, tus datos de contacto, tu dirección y tus preferencias. Los cambios se guardan solo en tu cuenta.")}</p></div>
      <div className={styles.profileCard}><ProfilePhotoCard key={account.userId} accountId={account.userId} initials={account.initials} fullName={account.displayName} email={account.email ?? "—"} initialAvatarUrl={account.avatarUrl} initialVisibility={{ menu: account.showPhotoInMenu, crew: account.showPhotoToCrew }} compact emailStatus={account.emailConfirmed ? "verified" : "pending"} /></div>
      <nav className={styles.profileShortcuts} aria-label={t("Profile shortcuts", "Accesos directos del perfil")}>
        <strong>{t("Jump to", "Ir a")}</strong>
        <div>
          <a href="#personal-details-heading">{t("Personal info", "Información personal")}</a>
          <a href="#contact-details-heading">{t("Contact", "Contacto")}</a>
          <a href="#mailing-address-heading">{t("Mailing address", "Dirección postal")}</a>
          <a href="#personalize-menu-heading">{t("Appearance", "Apariencia")}</a>
        </div>
      </nav>
    </section>
    <MenuLayoutPicker previewSearchResults={previewSearchResults} previewAccount={{ count: account.activity.activeCount, balance: account.balanceLabel, avatarUrl: account.avatarUrl, showPhoto: account.showPhotoInMenu }} />
    <MobileLogoSizePicker />
    <PreferenceSnapshot><NotificationBannerPicker initialPopupStyle={account.notificationPopupStyle} initialSpeed={account.notificationBannerSpeed} initialDisplaySeconds={account.notificationBannerDisplaySeconds} initialEnabled={account.headerNotificationsEnabled} initialStyle={account.notificationBannerStyle} /></PreferenceSnapshot>
    <ProfileDetailsForm ticket ownerId={account.userId} details={{
        savedFields: account.profileSavedFields,
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
    </ProfileReadBoundary>
  </AccountSettingsFrame>;
}
