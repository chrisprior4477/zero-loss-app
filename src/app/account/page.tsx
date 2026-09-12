import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfilePhotoCard } from "@/components/account/ProfilePhotoCard";
import { createClient } from "@/lib/supabase/server";
import { getPlayableBalanceLabel } from "@/lib/wallet/balance";

export const metadata: Metadata = { title: "My Account" };

const accountLinks = [
  ["My entries", "Track active entries and review results.", "/account/entries", "View entries"],
  ["Orders & fulfillment", "Follow rewards, retailer delivery, and next steps.", "/account/orders", "View orders"],
  ["Notifications", "Choose which account and result updates you receive.", "/account/notifications", "Manage alerts"],
  ["Security", "Password, trusted devices, and two-step verification.", "/account/security", "Secure account"],
] as const;

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: customer }] = await Promise.all([
    supabase.from("customer_profiles")
      .select("legal_first_name, legal_last_name, display_name, avatar_reference")
      .eq("customer_id", user.id).maybeSingle(),
    supabase.from("customers").select("verification_status")
      .eq("id", user.id).maybeSingle(),
  ]);

  const firstName = profile?.legal_first_name ?? "";
  const lastName = profile?.legal_last_name ?? "";
  const fullName = profile?.display_name?.trim() ||
    [firstName, lastName].filter(Boolean).join(" ") || "Zero Loss member";
  const email = user.email ?? "—";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "ZL";
  const status = customer?.verification_status === "email_verified" ? "Verified" : "Pending verification";
  let balance = "$0.00";
  try {
    balance = await getPlayableBalanceLabel(user.id);
  } catch {
    // Keep the dashboard available if the ledger is temporarily unavailable.
  }

  return (
    <PageContainer>
      <main className="mx-auto w-full max-w-6xl pb-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-300">My Zero Loss</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              Welcome back, {firstName || "there"}.
            </h1>
            <p className="mt-2 text-base text-white/60">Your balance, entries, rewards, and account settings in one place.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#31e800]/30 bg-[#31e800]/10 px-4 py-2 text-sm font-bold text-[#85ff68]">
            <span className="h-2 w-2 rounded-full bg-[#31e800]" aria-hidden="true" />
            {status} account
          </span>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_1.4fr]">
          <ProfilePhotoCard initials={initials} fullName={fullName} email={email} />

          <article className="overflow-hidden rounded-[28px] border border-[#31e800]/25 bg-[linear-gradient(135deg,#06375a_0%,#07533f_100%)]">
            <div className="p-6 sm:p-7">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[#72ff9f]">Playable balance</p>
              <p className="mt-3 text-5xl font-black tabular-nums tracking-[-0.05em] text-white">{balance}</p>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Use your wallet for eligible entries. Deposits and transactions stay together in your ledger.
              </p>
            </div>
            <div className="grid grid-cols-2 border-t border-white/12">
              <Link href="/account/wallet" className="grid min-h-14 place-items-center bg-[#31e800] px-4 text-sm font-black text-[#002719] transition hover:bg-[#72ff4e]">Add funds</Link>
              <Link href="/account/wallet" className="grid min-h-14 place-items-center border-l border-white/12 px-4 text-sm font-black text-white transition hover:bg-white/8">View transactions</Link>
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-5 sm:grid-cols-2">
          {accountLinks.map(([title, detail, href, action]) => (
            <Link key={title} href={href} className="group rounded-2xl border border-white/12 bg-white/[0.045] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-300/[0.07]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/55">{detail}</p>
                </div>
                <span className="text-xl text-cyan-300 transition group-hover:translate-x-1" aria-hidden="true">→</span>
              </div>
              <p className="mt-5 text-sm font-black text-cyan-300">{action}</p>
            </Link>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-white/12 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Personal information</h2>
              <p className="mt-1 text-sm text-white/55">{fullName} · {email}</p>
            </div>
            <button type="button" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-bold text-white transition hover:border-cyan-300/50 hover:text-cyan-200">Edit profile</button>
          </div>
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-white/40">
          Adding funds is shown as the next wallet step. No payment is taken until a payment provider is connected.
        </p>
      </main>
    </PageContainer>
  );
}
