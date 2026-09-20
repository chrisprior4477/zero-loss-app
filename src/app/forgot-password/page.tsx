import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset your password" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return <main className="min-h-[calc(100vh-163px)] bg-[radial-gradient(circle_at_12%_12%,rgba(0,185,255,.2),transparent_27%),linear-gradient(145deg,#00132e_0%,#031b44_52%,#001a3a_100%)] px-4 py-10 text-white sm:px-6">
    <section className="mx-auto max-w-lg rounded-[28px] border border-cyan-200/20 bg-[#001b3d]/95 p-6 shadow-[0_32px_90px_rgba(0,0,0,.4)] sm:p-10">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Account recovery</p>
      <h1 className="mt-3 text-3xl font-black sm:text-4xl">Forgot your password?</h1>
      <p className="mb-7 mt-3 text-sm leading-6 text-white/70">Enter the email you use for Zero Loss. We&apos;ll send a link to choose a new password.</p>
      <ForgotPasswordForm expired={error === "expired"} />
    </section>
  </main>;
}
