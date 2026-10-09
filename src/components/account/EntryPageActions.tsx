"use client";

import Link from "next/link";
import { useState } from "react";
import { productEntryHref } from "@/lib/entries/return-intent";
import { EntryOutcomeEmailPreference } from "./EntryOutcomeEmailPreference";
import styles from "./entry-page.module.css";

type CrewMember = { id: string; name: string };

export function EntryPageActions({ itemTitle, slug, remaining, crew, senderName, emailEnabled, returnHref }: {
  itemTitle: string; slug: string; remaining: number | null; crew: CrewMember[]; senderName: string; emailEnabled: boolean | null; returnHref: string;
}) {
  const [nextOpen, setNextOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [crewOpen, setCrewOpen] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<string[]>([]);
  const [demoAlertPrepared, setDemoAlertPrepared] = useState(false);
  const maxQuantity = Math.min(10, Math.max(0, remaining ?? 0));

  return <>
    <button type="button" className={styles.nextButton} aria-expanded={nextOpen} onClick={() => setNextOpen(open => !open)}>What happens next <span aria-hidden="true">{nextOpen ? "−" : "+"}</span></button>
    {nextOpen ? <div className={styles.nextPanel}>
      <p>The pool stays open until its available tickets are filled. Once the result is posted, your outcome will appear in My Activity and Notifications. If your entry is not selected, any optional purchase offer and its deadline will be shown separately.</p>
    </div> : null}

    <div className={styles.actionGrid}>
      <section className={styles.actionPanel} aria-labelledby="add-entries-title">
        <h3 id="add-entries-title">Want to help this pool close faster?</h3>
        <p>Add more separate chances for {itemTitle}. You will review and confirm them in the existing entry checkout.</p>
        {maxQuantity > 0 ? <><div className={styles.quantityControls} aria-label="Choose additional entries">
          <button type="button" aria-label="Remove one extra entry" onClick={() => setQuantity(value => Math.max(1, value - 1))} disabled={quantity === 1}>−</button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" aria-label="Add one extra entry" onClick={() => setQuantity(value => Math.min(maxQuantity, value + 1))} disabled={quantity === maxQuantity}>+</button>
          <span>{quantity === 1 ? "extra entry" : "extra entries"}</span>
        </div><Link className={styles.primaryLink} href={productEntryHref(slug, quantity)}>Review {quantity === 1 ? "one more entry" : `${quantity} more entries`} →</Link></> : <p className={styles.unavailable}>No additional tickets are available right now.</p>}
      </section>

      <section className={styles.actionPanel} aria-labelledby="crew-title">
        <h3 id="crew-title">Invite your Crew to this prize</h3>
        <p>Choose approved Crew members to share the {itemTitle} prize page. They will not see your entry or wallet details.</p>
        {crew.length ? <><button type="button" className={styles.crewToggle} aria-expanded={crewOpen} onClick={() => setCrewOpen(open => !open)}>Choose Crew members <span aria-hidden="true">⌄</span></button>
          {crewOpen ? <div className={styles.crewChoices}>{crew.map(member => <label key={member.id}><input type="checkbox" checked={selectedCrew.includes(member.id)} onChange={event => { setSelectedCrew(current => event.target.checked ? [...current, member.id] : current.filter(id => id !== member.id)); setDemoAlertPrepared(false); }} />{member.name}</label>)}</div> : null}
          <button type="button" className={styles.crewSend} disabled={!selectedCrew.length || demoAlertPrepared} onClick={() => setDemoAlertPrepared(true)}>{demoAlertPrepared ? "Demo alerts prepared for your Crew" : `Send demo alert${selectedCrew.length === 1 ? "" : "s"} to selected Crew`}</button>
          {demoAlertPrepared ? <div role="status" className={styles.demoNotice}><p>Demo alert from {senderName} for {selectedCrew.length} approved Crew {selectedCrew.length === 1 ? "member" : "members"}: <Link href={`/items/${slug}`}>View the {itemTitle} prize page</Link>.</p><p>No emails or messages were actually delivered.</p></div> : null}</> : <p className={styles.unavailable}>No approved Crew members yet. <Link href="/account/crew">Manage your Crew</Link></p>}
      </section>
    </div>
    <div className={styles.preference}><EntryOutcomeEmailPreference initialEnabled={emailEnabled} placement="entry-page" /></div>
    <Link href={returnHref} className={styles.returnButton}>Return to My Activity →</Link>
  </>;
}
