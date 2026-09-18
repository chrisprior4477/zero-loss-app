import Link from "next/link";
import { activityFilters, filterActivity, type AccountActivity, type ActivityFilter } from "@/lib/account/activity";
import { MyZeroLossGallery } from "./MyZeroLossGallery";
import { ActivitySelection } from "./ActivitySelection";
import { AccountIcon } from "./AccountIcon";
import styles from "./showroom.module.css";

const galleryStatusOrder = { prize: 0, active: 1, completion: 2, completed: 3 } as const;

function winnerFirst(items: AccountActivity["activity"]) {
  return [...items].sort((left, right) => galleryStatusOrder[left.status] - galleryStatusOrder[right.status]);
}

export function MyZeroLossActivity({ state, filter, selectedSlug }: { state: AccountActivity; filter: ActivityFilter; selectedSlug?: string }) {
  const verifiedState = state.source === "unavailable" ? { ...state, activity: [] } : state;
  const items = winnerFirst(filterActivity(verifiedState.activity, filter));
  return <section data-activity-source={state.source}>
    <nav aria-label="Filter My Activity" className={styles.filters}>
      {activityFilters.map(([key, label]) => <Link key={key} href={key === "all" ? "/account/entries" : `/account/entries?filter=${key}`} scroll={false} aria-current={filter === key ? "page" : undefined} data-filter={key} className={styles.filter}><AccountIcon name={key} /><span>{label}</span><span className={styles.filterCount}>{state.source === "unavailable" ? "—" : filterActivity(state.activity, key).length}</span></Link>)}
    </nav>
    {items.length ? <MyZeroLossGallery key={filter + items.map(item => item.slug).join(",")} items={items} filter={filter} /> : <div className={styles.empty}>
      <h2 className="text-xl font-bold text-white">{state.source === "unavailable" ? "Activity unavailable" : state.activity.length === 0 ? "Your next choice starts here" : "Nothing in this category yet"}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#b5cce4]">{state.source === "unavailable" ? "We can’t verify your activity right now. No entries or outcomes have been assumed. Please try again shortly." : state.activity.length === 0 ? "No activity yet. Your entries, prizes and purchase options will appear here after you participate." : "Choose another filter to see the rest of your activity."}</p>
      <Link href={state.activity.length === 0 ? "/" : "/account/entries"} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-5 text-sm font-black text-[#002719]">{state.activity.length === 0 ? "Explore products" : "View all activity"} <span aria-hidden="true" className="ml-3">›</span></Link>
    </div>}
    <ActivitySelection state={verifiedState} selectedSlug={selectedSlug} destination="/account/entries" filter={filter} />
  </section>;
}
