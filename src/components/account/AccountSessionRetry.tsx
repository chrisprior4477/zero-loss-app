import { AccountReadRetryButton } from "./AccountReadRetryButton";

export function AccountSessionRetry() {
  return <section className="mx-auto max-w-3xl px-5 py-10">
    <h1 className="text-2xl font-black">We couldn’t verify your session</h1>
    <p className="my-3">Your account is temporarily unavailable. Try this page again.</p>
    <AccountReadRetryButton label="Try again" className="rounded-xl bg-cyan-300 px-4 py-2 font-bold text-[#00132e]" />
  </section>;
}
