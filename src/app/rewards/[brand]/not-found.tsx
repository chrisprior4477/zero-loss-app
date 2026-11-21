import Link from "next/link";
import { HelpLandingScroll } from "@/components/help/HelpLandingScroll";

export default function RewardBrandNotFound() {
  return <section className="mx-auto max-w-3xl px-5 py-12 text-white">
    <HelpLandingScroll target="retailer-reward-unavailable" focusOnArrival />
    <h1 id="retailer-reward-unavailable" tabIndex={-1} className="text-3xl font-black">Retailer rewards unavailable</h1>
    <p className="mt-3 text-white/75">This retailer rewards link may be out of date.</p>
    <Link href="/#popular-rewards" className="mt-5 inline-flex min-h-11 items-center font-bold text-cyan-300 underline">Back to Popular Rewards →</Link>
  </section>;
}
