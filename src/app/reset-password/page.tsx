import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

type Props = { searchParams: Promise<{ updated?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { updated } = await searchParams;
  // This flag only selects an informational view. It never grants a session
  // or authorizes a password update; the server action still verifies the user.
  const saved = updated === "1";
  const user = saved ? null : (await (await createClient()).auth.getUser()).data.user;

  return <main className="min-h-[calc(100vh-163px)] bg-[radial-gradient(circle_at_12%_12%,rgba(0,185,255,.2),transparent_27%),linear-gradient(145deg,#00132e_0%,#031b44_52%,#001a3a_100%)] px-4 py-10 text-white sm:px-6">
    <section className="mx-auto max-w-lg rounded-[28px] border border-cyan-200/20 bg-[#001b3d]/95 p-6 shadow-[0_32px_90px_rgba(0,0,0,.4)] sm:p-10">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Account recovery</p>
      <h1 className="mt-3 text-3xl font-black sm:text-4xl">{saved ? "Password updated" : "Choose a new password"}</h1>
      {saved ? <>
        <p role="status" className="mt-5 rounded-xl border border-[#31e800]/35 bg-[#31e800]/10 p-4 text-sm leading-6">Your password has been changed. Sign in with your new password to continue.</p>
        <Link href="/login?focus=email#login-form" className="mt-6 grid min-h-12 place-items-center rounded-xl bg-[#00b9ff] px-5 font-black text-[#00132e]">Sign in</Link>
      </> : user ? <>
        <p className="mb-7 mt-3 text-sm leading-6 text-white/70">Save a new password for your Zero Loss account.</p>
        <ResetPasswordForm />
      </> : <>
        <p role="alert" className="mt-5 rounded-xl border border-orange-300/35 bg-orange-300/10 p-4 text-sm leading-6">This page needs a valid password-reset session. If you already saved a new password, try signing in with it. Otherwise, request a new reset link.</p>
        <Link href="/login?focus=email#login-form" className="mt-6 grid min-h-12 place-items-center rounded-xl bg-[#00b9ff] px-5 font-black text-[#00132e]">Sign in</Link>
        <Link href="/forgot-password" className="mt-4 block text-center text-sm font-semibold text-cyan-300 underline-offset-4 hover:underline">Request a new reset link</Link>
      </>}
    </section>
  </main>;
}
