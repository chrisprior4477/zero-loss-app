import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; verified?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email_confirmed_at) {
    redirect("/account");
  }

  const params = await searchParams;
  const initialError =
    params.error === "verification_failed"
      ? "Email verification failed or expired. Request a new link by signing up again, or contact support."
      : null;
  const initialNotice =
    params.verified === "1"
      ? "Email verified. Sign in to continue."
      : null;

  return (
    <main className="auth-signup-page min-h-[calc(100vh-163px)] overflow-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(0,185,255,.2),transparent_27%),radial-gradient(circle_at_90%_82%,rgba(255,99,15,.18),transparent_28%),linear-gradient(145deg,#00132e_0%,#031b44_52%,#001a3a_100%)] px-4 py-8 text-white sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[28px] border border-cyan-200/20 bg-[#001b3d]/90 shadow-[0_32px_90px_rgba(0,0,0,.4)] backdrop-blur md:grid-cols-[.82fr_1.18fr]">
        <section className="relative overflow-hidden border-b border-white/10 p-6 sm:p-9 md:border-b-0 md:border-r lg:p-12">
          <div aria-hidden="true" className="absolute -left-8 -top-8 h-52 w-52 bg-[#ff630f]/55 drop-shadow-[0_0_28px_rgba(255,99,15,.3)] [mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] [-webkit-mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat]" />
          <div aria-hidden="true" className="absolute -bottom-12 -right-10 h-72 w-72 bg-[#31e800]/16 [mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] [-webkit-mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat]" />
          <div aria-hidden="true" className="absolute right-5 top-5 h-14 w-14 bg-[#69edff] drop-shadow-[0_0_16px_rgba(105,237,255,.42)] [mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] [-webkit-mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] sm:right-8 sm:top-8 sm:h-20 sm:w-20" />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#69edff]">Your Zero Loss account</p>
            <h1 className="mt-4 max-w-md text-4xl font-black leading-[.98] tracking-[-0.055em] sm:text-5xl">Welcome back.<br /><span className="text-[#31e800]">Your next shot starts here.</span></h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/72">Sign in to review entries, outcomes, retailer-specific rewards, and everything waiting in your account.</p>
            <div className="mt-8 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Account protection</p>
              <p className="mt-2 text-sm leading-6 text-white/65">Optional two-step verification is coming to Account Security, powered by Supabase Auth.</p>
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(155deg,rgba(7,49,91,.86),rgba(0,19,46,.96))] p-6 sm:p-9 lg:p-12">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8a45]">Welcome back</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Sign in to Zero Loss.</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">New here? <Link href="/signup" className="font-bold text-cyan-300 underline-offset-4 hover:underline">Create an account</Link></p>
          <div className="mt-7">
            <LoginForm initialError={initialError} initialNotice={initialNotice} />
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-white/40">Signing in does not create an entry or make a purchase.</p>
          <div className="mt-5 border-t border-white/10 pt-5 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Investor preview</p>
            <Link href="/account/preview/entries" className="mt-3 inline-flex min-h-11 items-center rounded-full border border-cyan-300/40 bg-cyan-300/10 px-5 text-sm font-extrabold text-cyan-200 transition hover:bg-cyan-300 hover:text-[#00132e]">Preview a signed-in account →</Link>
            <p className="mt-2 text-xs leading-5 text-white/35">Opens the demonstration account without signing in.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
