import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfilePhotoCard } from "@/components/account/ProfilePhotoCard";
import { ProfileDetailsForm } from "@/components/account/ProfileDetailsForm";
import { AccountSettingsFrame } from "@/components/account/AccountSettingsFrame";
import { getAccountContext } from "@/lib/account/context";
import styles from "@/components/account/account-settings-pages.module.css";
import { authNavigationHref } from "@/lib/auth/entry-return";

export const metadata: Metadata = { title: "Your account" };

export default async function ProfilePage() {
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", "/account/profile"));
  return <AccountSettingsFrame active="profile" overview={{ balanceLabel: account.balanceLabel, fundingEnabled: account.fundingEnabled, activity: account.activity }}>
    <section className={styles.introTicket} aria-labelledby="profile-heading">
      <div><span className={styles.eyebrow}>PERSONAL PROFILE</span><h2 id="profile-heading">Profile</h2><p>Manage your identity, contact details, address, and preferences. Changes save only to your signed-in account.</p></div>
      <div className={styles.profileCard}><ProfilePhotoCard initials={account.initials} fullName={account.displayName} email={account.email ?? "—"} initialAvatarUrl={account.avatarUrl} compact emailStatus={account.emailConfirmed ? "verified" : "pending"} /></div>
    </section>
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
