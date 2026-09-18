import Link from "next/link";
import type { AccountActivity } from "@/lib/account/activity";
import { ActivityRows } from "./ActivityRows";
import { ActivitySelection } from "./ActivitySelection";

export function DashboardActivity({ state, selectedSlug }: { state: AccountActivity; selectedSlug?: string }) {
  const recent = state.activity.slice(0, 4);
  return <section className="mt-7" aria-labelledby="dashboard-activity-heading" data-activity-source={state.source}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="dashboard-activity-heading" className="text-2xl font-black tracking-tight text-white">Your latest activity</h2><p className="mt-1 text-sm text-[#b5cce4]">What’s still open, what’s ready, and what you can complete.</p></div>
      <Link href="/account/entries" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-cyan-300 hover:text-cyan-100 focus-visible:outline-2 focus-visible:outline-cyan-300">View all My Activity <span aria-hidden="true">›</span></Link>
    </div>
    <div className="mt-4">
      {recent.length ? <ActivityRows items={recent} destination="/account" compact /> : <div className="rounded-2xl border border-white/10 bg-[#06223d] p-6">
        <h3 className="text-lg font-bold text-white">{state.source === "unavailable" ? "Activity unavailable" : "Your next choice starts here"}</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#b5cce4]">{state.source === "unavailable" ? "We can’t verify your activity right now. Please try again shortly." : "No activity yet. Your entries, prizes and purchase options will appear right here."}</p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center gap-3 rounded-xl bg-[#31e800] px-5 text-sm font-black text-[#002719]">Explore products <span aria-hidden="true">›</span></Link>
      </div>}
    </div>
    <ActivitySelection state={state} selectedSlug={selectedSlug} destination="/account" />
  </section>;
}
