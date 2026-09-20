import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Continue password reset" };

type Props = { searchParams: Promise<{ token_hash?: string; code?: string }> };

export default async function RecoveryPage({ searchParams }: Props) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const code = typeof params.code === "string" ? params.code : "";
  const hasLink = Boolean(tokenHash || code);

  return <main className="min-h-[calc(100vh-163px)] bg-[radial-gradient(circle_at_12%_12%,rgba(0,185,255,.2),transparent_27%),linear-gradient(145deg,#00132e_0%,#031b44_52%,#001a3a_100%)] px-4 py-10 text-white sm:px-6">
    <section className="mx-auto max-w-lg rounded-[28px] border border-cyan-200/20 bg-[#001b3d]/95 p-6 shadow-[0_32px_90px_rgba(0,0,0,.4)] sm:p-10">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Account recovery</p>
      <h1 className="mt-3 text-3xl font-black sm:text-4xl">Continue password reset</h1>
      {hasLink ? <>
        <p className="mt-4 text-sm leading-6 text-white/70">For your security, confirm that you want to use this link. Your password has not changed yet.</p>
        <form action="/auth/confirm" method="post" className="mt-7">
          <input type="hidden" name="flow" value="recovery" />
          {tokenHash ? <input type="hidden" name="token_hash" value={tokenHash} /> : <input type="hidden" name="code" value={code} />}
          <button type="submit" className="grid min-h-12 w-full place-items-center rounded-xl bg-[#00b9ff] px-5 font-black text-[#00132e] hover:bg-cyan-200">Continue to new password</button>
        </form>
        <p className="mt-4 text-xs leading-5 text-white/55">If you didn&apos;t request this, you can close this page. Your password will stay the same.</p>
      </> : <>
        <p role="alert" className="mt-5 rounded-xl border border-orange-300/35 bg-orange-300/10 p-4 text-sm leading-6">This reset link is incomplete. Please request a new one.</p>
        <Link href="/forgot-password" className="mt-6 grid min-h-12 place-items-center rounded-xl bg-[#00b9ff] px-5 font-black text-[#00132e]">Request a new link</Link>
      </>}
    </section>
  </main>;
}
