"use client";

import Image from "next/image";
import { type MouseEvent, type PointerEvent, type RefObject, useRef, useState } from "react";
import styles from "./CrewAndWinnerPreview.module.css";
import { SharedPicksConcept } from "./SharedPicksConcept";
import { addSampleCrewPreview, sampleCrewPeople, useSampleCrewPreviews } from "@/lib/crew/sample-preview";

const people = sampleCrewPeople;

const storyPreviews = [
  { title: "A TV day at home", category: "Home & entertainment", photo: "/images/home/winner-previews/story-1.webp" },
  { title: "The sneaker moment", category: "Style & sneakers", photo: "/images/home/winner-previews/story-2.webp" },
  { title: "A coffee worth sharing", category: "Everyday favorites", photo: "/images/home/winner-previews/story-3.webp" },
  { title: "A fresh pair", category: "Style & sneakers", photo: "/images/home/winner-previews/story-4.webp" },
  { title: "Something for the family", category: "Home & entertainment", photo: "/images/home/winner-previews/story-5.webp" },
  { title: "The little wins", category: "Everyday favorites", photo: "/images/home/winner-previews/story-6.webp" },
  { title: "A ride to remember", category: "Outdoor adventures", photo: "/images/home/winner-previews/story-7.webp" },
  { title: "Cooking together", category: "Home essentials", photo: "/images/home/winner-previews/story-8.webp" },
  { title: "A new little upgrade", category: "Electronics", photo: "/images/home/winner-previews/story-9.webp" },
  { title: "A bright surprise", category: "Everyday favorites", photo: "/images/home/winner-previews/story-10.webp" },
  { title: "The patio moment", category: "Home & outdoors", photo: "/images/home/winner-previews/story-11.webp" },
  { title: "Game night begins", category: "Home & entertainment", photo: "/images/home/winner-previews/story-12.webp" },
] as const;

function useDragRail(ref: RefObject<HTMLDivElement | null>) {
  const drag = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });

  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      const rail = ref.current;
      if (!rail) return;
      drag.current = { active: true, moved: false, startX: event.clientX, scrollLeft: rail.scrollLeft };
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const rail = ref.current;
      if (!rail || !drag.current.active) return;
      const distance = event.clientX - drag.current.startX;
      if (Math.abs(distance) > 5) drag.current.moved = true;
      if (!drag.current.moved) return;
      event.preventDefault();
      if (!rail.hasPointerCapture(event.pointerId)) rail.setPointerCapture(event.pointerId);
      rail.scrollLeft = drag.current.scrollLeft - distance;
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      drag.current.active = false;
      const rail = ref.current;
      if (rail?.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: () => { drag.current.active = false; drag.current.moved = false; },
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      if (!drag.current.moved) return;
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    },
  };
}

type CrewSearchKind = "name" | "phone" | "email";
const emptyCrewSearch = { name: "", phone: "", email: "" };

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export function CrewAndWinnerPreview() {
  const crewRailRef = useRef<HTMLDivElement>(null);
  const storyRailRef = useRef<HTMLDivElement>(null);
  const crewDrag = useDragRail(crewRailRef);
  const storyDrag = useDragRail(storyRailRef);
  const previewRequests = useSampleCrewPreviews();
  const [crewMessage, setCrewMessage] = useState("");
  const [crewSearchOpen, setCrewSearchOpen] = useState(false);
  const [crewSearchValues, setCrewSearchValues] = useState(emptyCrewSearch);
  const [crewSearch, setCrewSearch] = useState<{ kind: CrewSearchKind; query: string } | null>(null);
  const [crewSearchNotice, setCrewSearchNotice] = useState("");
  const [selectedStory, setSelectedStory] = useState<number | null>(null);
  const [selectedCrew, setSelectedCrew] = useState<(typeof people)[number]["name"] | null>(null);

  function previewCrewRequest(name: (typeof people)[number]["name"]) {
    addSampleCrewPreview(name);
    setCrewMessage(`Preview only: no invitation was sent to ${name}. A real Crew connection would require their approval.`);
  }

  function moveRail(rail: HTMLDivElement | null, direction: -1 | 1) {
    if (!rail) return;
    const firstCard = rail.firstElementChild;
    if (!(firstCard instanceof HTMLElement)) return;
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({ left: direction * (firstCard.getBoundingClientRect().width + gap), behavior: "smooth" });
  }

  function openCrewSearch() {
    setCrewSearchOpen(true);
    setCrewSearch(null);
    setCrewSearchNotice("");
  }

  function closeCrewSearch() {
    setCrewSearchOpen(false);
    setCrewSearchValues(emptyCrewSearch);
    setCrewSearch(null);
    setCrewSearchNotice("");
  }

  function submitCrewSearch(kind: CrewSearchKind) {
    const query = crewSearchValues[kind].trim();
    if (!query) {
      setCrewSearchNotice(`Enter a ${kind === "phone" ? "phone number" : kind === "email" ? "email address" : "name"} to search.`);
      setCrewSearch(null);
      return;
    }
    setCrewSearch({ kind, query });
    setCrewSearchNotice("");
  }

  const searchMatches = crewSearch?.kind === "name"
    ? people.filter((person) => person.name.toLowerCase().includes(crewSearch.query.toLowerCase()))
    : [];

  return (
    <div className={styles.wrap}>
      <section aria-labelledby="find-your-crew-heading" className={styles.crewSection}>
        <div className={styles.headingRow}>
          <div>
            <span className={styles.eyebrow}>FRIENDS & FAMILY · FEATURE PREVIEW</span>
            <h2 id="find-your-crew-heading" className={styles.title}>Find your Crew</h2>
            <p className={styles.intro}>Keep your favorite people close. Share your picks only when you both choose to connect.</p>
          </div>
          <div className={styles.crewActions}>
            <button className={styles.outlineButton} type="button" onClick={openCrewSearch}>
              Add to Your Crew <span aria-hidden="true">→</span>
            </button>
            <div className={styles.arrows} aria-label="Crew carousel controls">
              <button type="button" aria-label="Previous Crew profiles" onClick={() => moveRail(crewRailRef.current, -1)}>‹</button>
              <button type="button" aria-label="Next Crew profiles" onClick={() => moveRail(crewRailRef.current, 1)}>›</button>
            </div>
          </div>
        </div>

        <div className={styles.peopleRail} ref={crewRailRef} aria-label="Fictional sample Crew profiles" onDragStart={(event) => event.preventDefault()} {...crewDrag}>
          {people.map((person) => {
            const requested = previewRequests.includes(person.name);
            return (
              <div className={styles.person} key={person.name}>
                <div className={styles.avatar}>
                  <Image src={person.photo} alt={`Fictional profile of ${person.name}`} draggable={false} fill sizes="(max-width: 640px) 88px, 112px" className={styles.avatarImage} />
                </div>
                <strong className={styles.personName}>{person.name}</strong>
                <button className={`${styles.addButton} ${requested ? styles.addButtonSelected : ""}`} type="button" onClick={() => previewCrewRequest(person.name)}>
                  {requested ? "Preview added" : "Add to Crew"}
                </button>
                <button className={styles.sharedButton} type="button" onClick={() => setSelectedCrew(person.name)}>
                  Shared picks <span aria-hidden="true">→</span>
                </button>
              </div>
            );
          })}
          <button className={styles.discoverPerson} type="button" onClick={openCrewSearch} aria-label="Add to Your Crew">
            <span className={styles.discoverAvatar} aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="27" cy="22" r="7" />
                <path d="M14 45c0-7 6-12 13-12s13 5 13 12" />
                <path d="M48 21v14m-7-7h14" />
              </svg>
            </span>
            <span>Add to Your<br />Crew</span>
          </button>
        </div>
        <p className={styles.demoNote}>Illustrative profiles. These people are fictional; no invitations are sent from this preview.</p>
        {crewMessage && <p className={styles.crewMessage} role="status">{crewMessage}</p>}
      </section>

      <section aria-labelledby="meet-winners-heading" className={styles.winnersSection}>
        <div className={styles.headingRow}>
          <div>
            <span className={styles.eyebrow}>STORIES WORTH SHARING</span>
            <h2 id="meet-winners-heading" className={styles.title}>Meet our winners</h2>
            <p className={styles.intro}>A place for real people to share their moments, when they choose to.</p>
          </div>
          <div className={styles.arrows} aria-label="Winner story carousel controls">
            <button type="button" aria-label="Previous stories" onClick={() => moveRail(storyRailRef.current, -1)}>‹</button>
            <button type="button" aria-label="Next stories" onClick={() => moveRail(storyRailRef.current, 1)}>›</button>
          </div>
        </div>
        <p className={styles.storyNotice}>Layout preview: these images feature fictional models, not actual winners. Verified, permission-based stories and videos will replace them.</p>

        <div className={styles.storyRail} ref={storyRailRef} aria-label="Sample winner story cards" onDragStart={(event) => event.preventDefault()} {...storyDrag}>
          {storyPreviews.map((story, index) => (
            <button key={story.title} type="button" className={styles.storyCard} onClick={() => setSelectedStory(index)} aria-label={`Open illustrative story preview: ${story.title}`}>
              <Image src={story.photo} alt="Fictional lifestyle scene" draggable={false} fill sizes="(max-width: 640px) 72vw, (max-width: 900px) 40vw, 300px" className={styles.storyImage} />
              <span className={styles.storyShade} />
              <span className={styles.playIcon} aria-hidden="true">▶</span>
              <span className={styles.storyText}>
                <span className={styles.storyTag}>SAMPLE STORY</span>
                <strong>{story.title}</strong>
                <span>{story.category}</span>
              </span>
            </button>
          ))}
        </div>
        <p className={styles.swipeHint}>Swipe or use the arrows to explore <span aria-hidden="true">→</span></p>
      </section>

      {crewSearchOpen && (
        <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) closeCrewSearch(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="crew-search-title" className={styles.searchModal}>
            <button type="button" className={styles.closeButton} aria-label="Close Crew search" onClick={closeCrewSearch}>×</button>
            <div className={styles.searchHeading}>
              <span className={styles.searchHeadingIcon} aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="27" cy="22" r="7" /><path d="M14 45c0-7 6-12 13-12s13 5 13 12M48 21v14m-7-7h14" />
                </svg>
              </span>
              <div>
                <span className={styles.eyebrow}>FRIENDS & FAMILY · FEATURE PREVIEW</span>
                <h3 id="crew-search-title">Add to Your Crew</h3>
              </div>
            </div>
            <p className={styles.searchIntro}>Find people by name, phone, or email. Connections and shared picks appear only after both people choose to connect.</p>
            <div className={styles.searchFields}>
              {(["name", "phone", "email"] as const).map((kind) => (
                <form key={kind} className={styles.searchRow} onSubmit={(event) => { event.preventDefault(); submitCrewSearch(kind); }}>
                  <label className={styles.srOnly} htmlFor={`crew-search-${kind}`}>Search by {kind === "phone" ? "phone number" : kind === "email" ? "email address" : "name"}</label>
                  <input
                    id={`crew-search-${kind}`}
                    type={kind === "email" ? "email" : kind === "phone" ? "tel" : "search"}
                    autoComplete="off"
                    placeholder={`Search by ${kind === "phone" ? "phone number" : kind === "email" ? "email address" : "name"}...`}
                    value={crewSearchValues[kind]}
                    onChange={(event) => setCrewSearchValues((current) => ({ ...current, [kind]: event.target.value }))}
                  />
                  <button type="submit" aria-label={`Search Crew by ${kind}`}><SearchIcon /></button>
                </form>
              ))}
            </div>
            <div className={styles.searchResults} aria-live="polite">
              {crewSearchNotice ? <p role="status">{crewSearchNotice}</p> : crewSearch === null ? (
                <p>Type a name and press search to see the sample Crew profiles.</p>
              ) : crewSearch.kind !== "name" ? (
                <p>No phone or email directory is connected in this preview. Real search will show only people who choose to be discoverable.</p>
              ) : searchMatches.length === 0 ? (
                <p>No sample Crew profiles match that name yet.</p>
              ) : (
                <div className={styles.searchMatchList}>
                  {searchMatches.map((person) => (
                    <div className={styles.searchMatch} key={person.name}>
                      <Image src={person.photo} alt="" width={48} height={48} />
                      <div><strong>{person.name}</strong><span>Fictional sample profile</span></div>
                      <button type="button" onClick={() => {
                        previewCrewRequest(person.name);
                        setCrewSearchNotice(`Preview only: ${person.name} was added to this sample Crew. No invitation was sent.`);
                      }}>{previewRequests.includes(person.name) ? "Preview added" : "Add to Crew"}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.searchFooter}>
              <p>Preview only. Search details are not saved or sent; real connections will require approval.</p>
              <button type="button" onClick={closeCrewSearch}>Done <span aria-hidden="true">✓</span></button>
            </div>
          </div>
        </div>
      )}

      {selectedStory !== null && (
        <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedStory(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="sample-story-title" className={styles.modal}>
            <button type="button" className={styles.closeButton} aria-label="Close preview" onClick={() => setSelectedStory(null)}>×</button>
            <div className={styles.modalImage}>
              <Image src={storyPreviews[selectedStory].photo} alt="Fictional lifestyle scene" fill sizes="(max-width: 640px) 90vw, 480px" className={styles.storyImage} />
            </div>
            <div className={styles.modalCopy}>
              <span className={styles.eyebrow}>SAMPLE LAYOUT · NO VIDEO YET</span>
              <h3 id="sample-story-title">{storyPreviews[selectedStory].title}</h3>
              <p>This is a visual preview, not a real winner account. Actual videos and stories will appear only after a winner is verified and gives permission to share.</p>
              <button type="button" className={styles.outlineButton} onClick={() => setSelectedStory(null)}>Back to stories</button>
            </div>
          </div>
        </div>
      )}
      {selectedCrew ? <SharedPicksConcept initialPerson={selectedCrew} onClose={() => setSelectedCrew(null)} /> : null}
    </div>
  );
}
