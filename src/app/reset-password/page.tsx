import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <main className="min-h-[calc(100vh-163px)] bg-[radial-gradient(circle_at_12%_12%,rgba(0,185,255,.2),transparent_27%),linear-gradient(145deg,#00132e_0%,#031b44_52%,#001a3a_100%)] px-4 py-10 text-white sm:px-6">
    <section className="mx-auto max-w-lg rounded-[28px] border border-cyan-200/20 bg-[#001b3d]/95 p-6 shadow-[0_32px_90px_rgba(0,0,0,.4)] sm:p-10">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Account recovery</p>
      <h1 className="mt-3 text-3xl font-black sm:text-4xl">Choose a new password</h1>
      {user ? <><p className="mb-7 mt-3 text-sm leading-6 text-white/70">Save a new password for your Zero Loss account.</p><ResetPasswordForm /></> : <><p role="alert" className="mt-5 rounded-xl border border-orange-300/35 bg-orange-300/10 p-4 text-sm leading-6">This reset link is expired or has already been used.</p><Link href="/forgot-password" className="mt-6 grid min-h-12 place-items-center rounded-xl bg-[#00b9ff] px-5 font-black text-[#00132e]">Request a new link</Link></>}
    </section>
  </main>;
}
