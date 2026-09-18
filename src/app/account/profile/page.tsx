import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfilePhotoCard } from "@/components/account/ProfilePhotoCard";
import { ProfileDetailsForm } from "@/components/account/ProfileDetailsForm";
import { getAccountContext } from "@/lib/account/context";
import styles from "@/components/account/profile-editor.module.css";

export const metadata: Metadata = { title: "Your account" };

export default async function ProfilePage() {
  const account = await getAccountContext();
  if (!account) redirect("/login");
  return <main className={styles.page}><div className={styles.shell}>
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/account">My Account</Link><span aria-hidden="true">›</span><Link href="/account/security">Account &amp; Security</Link><span aria-hidden="true">›</span><span>Edit Profile</span></nav>
    <header className={styles.heading}><div><p>PERSONAL PROFILE</p><h1>Edit Profile</h1><span>Manage your identity, contact details, address, and preferences.</span></div><aside><strong>YOUR INFORMATION</strong>Changes save only to your signed-in account through the protected profile service.</aside></header>
    <div className={styles.profileGrid}>
      <aside className={styles.photoPanel}><ProfilePhotoCard initials={account.initials} fullName={account.displayName} email={account.email ?? "—"} initialAvatarUrl={account.avatarUrl} /><p className={styles.photoTip}>Your profile photo and display name appear throughout your account and follow you across devices.</p></aside>
      <ProfileDetailsForm details={{
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
    </div>
  </div></main>;
}
