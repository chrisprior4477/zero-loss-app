"use client";

import Image from "next/image";
import { useRef } from "react";
import { sampleCrewPeople, type SampleCrewName } from "@/lib/crew/sample-preview";
import type { CrewPersonCard } from "./CrewPeopleCarousel";
import styles from "./crew-people-first.module.css";

export function CrewPeopleFirst({ people, samples, selectedKey, onAdd, onRemove, onSampleRemove, onSamplePicks, onMemberPicks, pending }: {
  people: CrewPersonCard[]; samples: SampleCrewName[]; selectedKey: string | null;
  onAdd: () => void; onRemove: (id: string) => void; onSampleRemove: (name: SampleCrewName) => void;
  onSamplePicks: (name: SampleCrewName) => void; onMemberPicks: (id: string) => void; pending: boolean;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const selectedMember = people.find(person => person.memberId === selectedKey);
  const selectedSample = samples.find(name => `sample-${name}` === selectedKey);
  function move(direction: number) {
    rail.current?.scrollBy({ left: direction * 240, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  return <div className={styles.people}>
    <div className={styles.peopleHeading}><h2>People in your Crew</h2><div className={styles.peopleTools}>
      {selectedMember || selectedSample ? <details key={selectedKey} className={styles.manage}><summary>Manage</summary><div>
        {selectedMember ? <button type="button" disabled={pending} onClick={() => onRemove(selectedMember.invitationId)}>Remove {selectedMember.name} from Crew</button> : <button type="button" onClick={() => selectedSample && onSampleRemove(selectedSample)}>Remove preview</button>}
      </div></details> : null}
      <button type="button" onClick={() => move(-1)} aria-label="Previous Crew member">‹</button><button type="button" onClick={() => move(1)} aria-label="Next Crew member">›</button>
    </div></div>
    <div className={styles.peopleRail} ref={rail} aria-label="People in your Crew">
      {people.map(person => <div key={person.memberId} className={`${styles.person} ${selectedKey === person.memberId ? styles.personSelected : ""}`}><button type="button" aria-label={`See ${person.name}'s shared activity`} aria-expanded={selectedKey === person.memberId} onClick={() => onMemberPicks(person.memberId)}>
        <span className={styles.avatar}>{person.avatarUrl ? <Image src={person.avatarUrl} alt="" fill sizes="52px" unoptimized /> : person.name.slice(0, 1).toUpperCase()}</span><span className={styles.personName}>{person.name}</span><small>Connected</small>
      </button></div>)}
      {sampleCrewPeople.filter(person => samples.includes(person.name)).map(person => <div key={person.name} className={`${styles.person} ${selectedKey === `sample-${person.name}` ? styles.personSelected : ""}`}><button type="button" aria-label={`See ${person.name}'s sample shared activity`} aria-expanded={selectedKey === `sample-${person.name}`} onClick={() => onSamplePicks(person.name)}>
        <span className={styles.avatar}><Image src={person.photo} alt="" fill sizes="52px" /></span><span className={styles.personName}>{person.name}</span><small>Sample preview</small>
      </button></div>)}
      <button type="button" onClick={onAdd} className={styles.addPerson} aria-label="Add to Your Crew"><span aria-hidden="true">+</span>Add person</button>
    </div>
    {samples.length ? <p className={styles.sampleNotice}>Fictional sample profiles—no invitations sent. Real members join after approval.</p> : null}
  </div>;
}
