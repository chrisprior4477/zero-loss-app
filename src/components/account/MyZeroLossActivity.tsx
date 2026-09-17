import Link from "next/link";
import { activityFilters, filterActivity, type AccountActivity, type ActivityFilter } from "@/lib/account/activity";
import { ActivityRows } from "./ActivityRows";
import { ActivitySelection } from "./ActivitySelection";

export function MyZeroLossActivity({ state, filter, selectedSlug }: { state: AccountActivity; filter: ActivityFilter; selectedSlug?: string }) {
  const items = filterActivity(state.activity, filter);
  return <section data-activity-source={state.source}>
    <nav aria-label="Filter My Zero Loss" className="mt-7 flex flex-wrap gap-2">
      {activityFilters.map(([key, label]) => <Link key={key} href={key === "all" ? "/account/entries" : `/account/entries?filter=${key}`} aria-current={filter === key ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-cyan-300 ${filter === key ? "border-cyan-300 bg-cyan-300 text-[#00172f]" : "border-white/15 bg-[#06223d] text-[#b5cce4] hover:border-cyan-300/50"}`}>{label}<span className={filter === key ? "text-[#00172f]/70" : "text-[#b5cce4]/60"}>{state.source === "unavailable" ? "—" : filterActivity(state.activity, key).length}</span></Link>)}
    </nav>
    {items.length ? <div className="mt-5"><ActivityRows items={items} filter={filter} /></div> : <div className="mt-5 rounded-2xl border border-white/10 bg-[#06223d] p-6 sm:p-8">
      <h2 className="text-xl font-bold text-white">{state.source === "unavailable" ? "Activity unavailable" : state.activity.length === 0 ? "Your next choice starts here" : "Nothing in this category yet"}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#b5cce4]">{state.source === "unavailable" ? "We can’t verify your activity right now. No entries or outcomes have been assumed. Please try again shortly." : state.activity.length === 0 ? "No activity yet. Your entries, prizes and purchase options will appear here after you participate." : "Choose another filter to see the rest of your activity."}</p>
      <Link href={state.activity.length === 0 ? "/" : "/account/entries"} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-5 text-sm font-black text-[#002719]">{state.activity.length === 0 ? "Explore products" : "View all activity"} <span aria-hidden="true" className="ml-3">›</span></Link>
    </div>}
    <ActivitySelection state={state} selectedSlug={selectedSlug} destination="/account/entries" filter={filter} />
  </section>;
}
