import { ContinueShoppingLink } from "@/components/catalog/ContinueShoppingLink";
import Link from "next/link";
import { activityFilters, filterActivity, openEntriesAnchorId, openEntriesHref, type AccountActivity, type ActivityFilter } from "@/lib/account/activity";
import { MyZeroLossGallery } from "./MyZeroLossGallery";
import { ActivitySelection } from "./ActivitySelection";
import { AccountIcon } from "./AccountIcon";
import { ClearAllEntriesButton } from "./ClearAllEntriesButton";
import { MyActivityLandingScroll } from "./MyActivityLandingScroll";
import { ActivityNotificationRead } from "@/components/notifications/ActivityNotificationRead";
import { buildAccountNotifications } from "@/lib/account/notifications";
import styles from "./my-activity.module.css";
import type { ActivityOfferMetrics } from "@/lib/account/activity-progress";
import type { EntryRequest } from "@/lib/entries/request";

const galleryStatusOrder = { prize: 0, active: 1, completion: 2, completed: 3 } as const;
const activityHeadings: Record<ActivityFilter, string> = {
  all: "This is all of your activity",
  active: "The prizes you've entered",
  prize: "These are the prizes you won",
  completion: "These are your purchase options",
  completed: "Prizes won & completed purchases",
};
const emptyMessages: Record<ActivityFilter, { title: string; detail: string }> = {
  all: { title: "Unfortunately, you don't have any activity yet.", detail: "Your entries, rewards, and purchase options will appear here." },
  active: { title: "Unfortunately, you don't have any open entries yet.", detail: "Your entries will appear here once you enter a reward." },
  prize: { title: "Unfortunately, you haven't won anything yet.", detail: "We will notify you when you do." },
  completion: { title: "Unfortunately, you don't have any purchase options yet.", detail: "We will notify you if one becomes available." },
  completed: { title: "Unfortunately, you don't have any completed activity yet.", detail: "Your completed rewards and purchases will appear here." },
};

function winnerFirst(items: AccountActivity["activity"]) {
  return [...items].sort((left, right) => galleryStatusOrder[left.status] - galleryStatusOrder[right.status]);
}

export function MyZeroLossActivity({ state, filter, metricsBySlug = {}, pendingEntries = [], outcomeEmailPreference = null, selectedSlug, selectedEntryId, viewedEntryId, returnToOptions = false, resumePurchase = false, canClearDemoEntries = false }: { state: AccountActivity; filter: ActivityFilter; metricsBySlug?: Record<string, ActivityOfferMetrics>; pendingEntries?: EntryRequest[]; outcomeEmailPreference?: boolean | null; selectedSlug?: string; selectedEntryId?: string; viewedEntryId?: string; returnToOptions?: boolean; resumePurchase?: boolean; canClearDemoEntries?: boolean }) {
  const verifiedState = state.source === "unavailable" ? { ...state, activity: [] } : state;
  const allItems = filterActivity(verifiedState.activity, "all");
  const items = winnerFirst(filterActivity(verifiedState.activity, filter));
  const pendingOnly = pendingEntries.length > 0 && allItems.length === 0 && (filter === "all" || filter === "active");
  return <section data-activity-source={state.source}>
    <ActivityNotificationRead filter={filter} available={state.source !== "unavailable"} detailOpen={Boolean(selectedSlug || selectedEntryId || resumePurchase)} visibleIds={buildAccountNotifications({ ...verifiedState, activity: items }, null, false).map(notification => notification.id)} />
    <MyActivityLandingScroll filter={filter} revealControls={items.length === 0 && !pendingOnly} enabled={!selectedSlug && !selectedEntryId && !viewedEntryId && !returnToOptions && !resumePurchase} />
    <nav id={openEntriesAnchorId} aria-label="Filter My Activity" className={styles.filters}>
      {activityFilters.map(([key, label]) => <Link key={key} href={key === "active" ? openEntriesHref : key === "all" ? "/account/entries" : `/account/entries?filter=${key}`} scroll={key === "active"} aria-current={filter === key ? "page" : undefined} data-filter={key} className={styles.filter}><AccountIcon name={key} /><span>{label}</span><span className={styles.filterCount}>{state.source === "unavailable" ? "—" : filterActivity(state.activity, key).length}</span></Link>)}
    </nav>
    {pendingEntries.length > 0 && state.source !== "unavailable" ? <div className="mb-5 rounded-2xl border border-cyan-300/50 bg-[#062b4d] px-5 py-4 text-white" role="status">
      <p className="font-extrabold">{pendingEntries.length === 1 ? "Entry request awaiting confirmation" : `${pendingEntries.length} entry requests awaiting confirmation`}</p>
      <p className="mt-1 text-sm text-[#b5cce4]">{pendingEntries[0].title} is saved as a pending request. It will appear in your activity after confirmation; it is not a completed entry yet.</p>
      <Link href={`/items/${pendingEntries[0].slug}#enter-entry`} className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#31e800] px-4 text-sm font-extrabold text-[#002719]">Review pending entry <span aria-hidden="true" className="ml-2">›</span></Link>
    </div> : null}
    {items.length > 0 ? <h2 className={styles.activityHeading}>{activityHeadings[filter]}</h2> : null}
    {items.length ? <MyZeroLossGallery key={filter + items.map(item => item.entryId ?? item.slug).join(",")} items={items} filter={filter} metricsBySlug={metricsBySlug} viewedEntryId={viewedEntryId} canClearDemoEntries={canClearDemoEntries} /> : <><div className={styles.empty}>
      <h2 className="text-xl font-bold text-white">{state.source === "unavailable" ? "Activity unavailable" : pendingOnly ? "Your entry is being confirmed" : emptyMessages[filter].title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#b5cce4]">{state.source === "unavailable" ? "We can’t verify your activity right now. No entries or outcomes have been assumed. Please try again shortly." : pendingOnly ? "Confirm your pending request above, or wait for the automatic result. Your activity will update when the entry is accepted." : emptyMessages[filter].detail}</p>
      {state.source !== "unavailable" && allItems.length > 0 ? <Link href="/account/entries" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-5 text-sm font-black text-[#002719]">See my other activity <span aria-hidden="true" className="ml-3">›</span></Link> : null}
    </div><div id="my-activity-empty-controls" className={styles.emptyControls}><ContinueShoppingLink  className={styles.continueShopping}>Continue shopping</ContinueShoppingLink>{canClearDemoEntries && state.source !== "unavailable" ? <ClearAllEntriesButton /> : null}</div></>}
    <ActivitySelection state={verifiedState} selectedSlug={selectedSlug} selectedEntryId={selectedEntryId} destination="/account/entries" filter={filter} metricsBySlug={metricsBySlug} outcomeEmailPreference={outcomeEmailPreference} returnToOptions={returnToOptions} resumePurchase={resumePurchase} />
  </section>;
}
