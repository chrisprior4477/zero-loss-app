import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfilePhotoCard } from "@/components/account/ProfilePhotoCard";
import { getAccountContext } from "@/lib/account/context";

export const metadata: Metadata = { title: "Your account" };

export default async function ProfilePage() {
  const account = await getAccountContext();
  if (!account) redirect("/login");
  return <PageContainer>
    <main className="mx-auto w-full max-w-3xl pb-10">
      <Link href="/account" className="inline-flex min-h-11 items-center text-sm font-bold text-cyan-300 hover:text-white">‹ Account Dashboard</Link>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Your account</h1>
      <p className="mb-6 mt-2 text-sm text-[#b5cce4]">Your personal information and profile photo.</p>
      <ProfilePhotoCard initials={account.initials} fullName={account.displayName} email={account.email ?? "—"} initialAvatarUrl={account.avatarUrl} />
      <section aria-label="Personal information" className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-[#b5cce4]">
        <h2 className="font-bold text-white">Personal information</h2>
        <p className="mt-2">Your name is displayed exactly as stored on your account. Name and email editing are not enabled yet.</p>
        <p className="mt-3">{account.emailConfirmed ? "Email confirmed" : "Email confirmation pending"}</p>
        <Link href="/account/security" className="mt-3 inline-flex min-h-11 items-center font-bold text-cyan-300 hover:text-white">Account & Security ›</Link>
      </section>
    </main>
  </PageContainer>;
}
