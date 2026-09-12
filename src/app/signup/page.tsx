import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpExperience } from "@/components/auth/SignUpExperience";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account } = await searchParams;
  const initialAccountPath = account === "business" ? "business" : "pleasure";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email_confirmed_at) redirect("/account");

  return (
    <main className="auth-signup-page min-h-[calc(100vh-163px)] overflow-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(0,185,255,.2),transparent_27%),radial-gradient(circle_at_90%_82%,rgba(255,99,15,.18),transparent_28%),linear-gradient(145deg,#00132e_0%,#031b44_52%,#001a3a_100%)] px-0 pb-8 pt-0 text-white sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-b-[28px] border-x border-b border-cyan-200/20 bg-[#001b3d]/90 shadow-[0_32px_90px_rgba(0,0,0,.4)] backdrop-blur sm:rounded-[28px] sm:border md:grid-cols-[.82fr_1.18fr]">
        <section className="relative overflow-hidden border-b border-white/10 p-6 sm:p-9 md:border-b-0 md:border-r lg:p-12">
          <div aria-hidden="true" className="absolute -left-8 -top-8 h-52 w-52 bg-[#ff630f]/55 drop-shadow-[0_0_28px_rgba(255,99,15,.3)] [mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] [-webkit-mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat]" />
          <div aria-hidden="true" className="absolute -bottom-12 -right-10 h-72 w-72 bg-[#31e800]/16 [mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] [-webkit-mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat]" />
          <div aria-hidden="true" className="absolute right-5 top-14 h-14 w-14 bg-[#69edff] drop-shadow-[0_0_16px_rgba(105,237,255,.42)] [mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] [-webkit-mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] sm:right-8 sm:top-8 sm:h-20 sm:w-20" />
          <div className="relative z-10">
            <h1 className="max-w-md text-4xl font-black leading-[.98] tracking-[-0.055em] sm:text-5xl">One account.<br /><span className="text-[#31e800]">Every $1 shot counts.</span></h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/72">Save entries, review outcomes, and keep retailer-specific rewards and completion options organized in one secure place.</p>
          </div>
        </section>
        <section className="bg-[linear-gradient(155deg,rgba(7,49,91,.86),rgba(0,19,46,.96))] p-6 sm:p-9 lg:p-12">
          <SignUpExperience key={initialAccountPath} initialAccountPath={initialAccountPath} />
        </section>
      </div>
    </main>
  );
}
