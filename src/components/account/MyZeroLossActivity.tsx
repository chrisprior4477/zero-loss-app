import Link from "next/link";
import { activityFilters, filterActivity, type AccountActivity, type ActivityFilter } from "@/lib/account/activity";
import { MyZeroLossGallery } from "./MyZeroLossGallery";
import { ActivitySelection } from "./ActivitySelection";
import { AccountIcon } from "./AccountIcon";
import styles from "./my-activity.module.css";
import type { ActivityOfferMetrics } from "@/lib/account/activity-progress";
import type { EntryRequest } from "@/lib/entries/request";

const galleryStatusOrder = { prize: 0, active: 1, completion: 2, completed: 3 } as const;

function winnerFirst(items: AccountActivity["activity"]) {
  return [...items].sort((left, right) => galleryStatusOrder[left.status] - galleryStatusOrder[right.status]);
}

export function MyZeroLossActivity({ state, filter, metricsBySlug = {}, pendingEntries = [], outcomeEmailPreference = null, selectedSlug, selectedEntryId, viewedEntryId, canClearDemoEntries = false }: { state: AccountActivity; filter: ActivityFilter; metricsBySlug?: Record<string, ActivityOfferMetrics>; pendingEntries?: EntryRequest[]; outcomeEmailPreference?: boolean | null; selectedSlug?: string; selectedEntryId?: string; viewedEntryId?: string; canClearDemoEntries?: boolean }) {
  const verifiedState = state.source === "unavailable" ? { ...state, activity: [] } : state;
  const allItems = filterActivity(verifiedState.activity, "all");
  const items = winnerFirst(filterActivity(verifiedState.activity, filter));
  return <section data-activity-source={state.source}>
    <nav aria-label="Filter My Activity" className={styles.filters}>
      {activityFilters.map(([key, label]) => <Link key={key} href={key === "all" ? "/account/entries" : `/account/entries?filter=${key}`} scroll={false} aria-current={filter === key ? "page" : undefined} data-filter={key} className={styles.filter}><AccountIcon name={key} /><span>{label}</span><span className={styles.filterCount}>{state.source === "unavailable" ? "—" : filterActivity(state.activity, key).length}</span></Link>)}
    </nav>
    {pendingEntries.length > 0 && state.source !== "unavailable" ? <div className="mb-5 rounded-2xl border border-cyan-300/50 bg-[#062b4d] px-5 py-4 text-white" role="status">
      <p className="font-extrabold">{pendingEntries.length === 1 ? "Entry request awaiting confirmation" : `${pendingEntries.length} entry requests awaiting confirmation`}</p>
      <p className="mt-1 text-sm text-[#b5cce4]">{pendingEntries[0].title} is saved as a pending request. It will appear in your activity after confirmation; it is not a completed entry yet.</p>
      <Link href={`/items/${pendingEntries[0].slug}#enter-entry`} className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#31e800] px-4 text-sm font-extrabold text-[#002719]">Review pending entry <span aria-hidden="true" className="ml-2">›</span></Link>
    </div> : null}
    {items.length ? <MyZeroLossGallery key={filter + items.map(item => item.entryId ?? item.slug).join(",")} items={items} filter={filter} metricsBySlug={metricsBySlug} viewedEntryId={viewedEntryId} canClearDemoEntries={canClearDemoEntries} /> : <div className={styles.empty}>
      <h2 className="text-xl font-bold text-white">{state.source === "unavailable" ? "Activity unavailable" : pendingEntries.length && allItems.length === 0 ? "Your entry is being confirmed" : allItems.length === 0 ? "Your next choice starts here" : "Nothing in this category yet"}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#b5cce4]">{state.source === "unavailable" ? "We can’t verify your activity right now. No entries or outcomes have been assumed. Please try again shortly." : pendingEntries.length && allItems.length === 0 ? "Confirm your pending request above, or wait for the automatic result. Your activity will update when the entry is accepted." : allItems.length === 0 ? "No activity yet. Your entries, prizes and purchase options will appear here after you participate." : "Choose another filter to see the rest of your activity."}</p>
      {state.source !== "unavailable" && !(pendingEntries.length && allItems.length === 0) ? <Link href={allItems.length === 0 ? "/" : "/account/entries"} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-5 text-sm font-black text-[#002719]">{allItems.length === 0 ? "Explore products" : "View all activity"} <span aria-hidden="true" className="ml-3">›</span></Link> : null}
    </div>}
    <ActivitySelection state={verifiedState} selectedSlug={selectedSlug} selectedEntryId={selectedEntryId} destination="/account/entries" filter={filter} metricsBySlug={metricsBySlug} outcomeEmailPreference={outcomeEmailPreference} />
  </section>;
}
