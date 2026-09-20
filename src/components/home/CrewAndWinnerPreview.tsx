"use client";

import Image from "next/image";
import { type MouseEvent, type PointerEvent, type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./CrewAndWinnerPreview.module.css";
import { SharedPicksConcept } from "./SharedPicksConcept";
import { CrewDiscoveryPanel } from "./CrewDiscoveryDialog";
import { addSampleCrewPreview, featuredCrewPeople, useSampleCrewPreviews } from "@/lib/crew/sample-preview";

const people = featuredCrewPeople;

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
      rail.style.scrollBehavior = "auto";
      rail.style.scrollSnapType = "none";
      if (!rail.hasPointerCapture(event.pointerId)) rail.setPointerCapture(event.pointerId);
      rail.scrollLeft = drag.current.scrollLeft - distance;
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      drag.current.active = false;
      const rail = ref.current;
      if (rail) { rail.style.scrollBehavior = ""; rail.style.scrollSnapType = ""; }
      if (rail?.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: () => { drag.current.active = false; drag.current.moved = false; if (ref.current) { ref.current.style.scrollBehavior = ""; ref.current.style.scrollSnapType = ""; } },
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      if (!drag.current.moved) return;
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    },
  };
}

export function CrewAndWinnerPreview() {
  const crewRailRef = useRef<HTMLDivElement>(null);
  const crewStageRef = useRef<HTMLDivElement>(null);
  const crewSearchButtonRef = useRef<HTMLButtonElement>(null);
  const selectedPersonRef = useRef<HTMLElement>(null);
  const activityPanelRef = useRef<HTMLElement>(null);
  const outlineSvgRef = useRef<SVGSVGElement>(null);
  const outlinePathRef = useRef<SVGPathElement>(null);
  const storyRailRef = useRef<HTMLDivElement>(null);
  const crewDrag = useDragRail(crewRailRef);
  const storyDrag = useDragRail(storyRailRef);
  const previewRequests = useSampleCrewPreviews();
  const [crewMessage, setCrewMessage] = useState("");
  const [crewSearchOpen, setCrewSearchOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<number | null>(null);
  const [selectedCrew, setSelectedCrew] = useState<(typeof people)[number]["name"] | null>(null);

  useEffect(() => {
    if (!selectedCrew && !crewSearchOpen) return;
    const closeWhenOutside = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (activityPanelRef.current?.contains(target) || selectedPersonRef.current?.contains(target) || crewSearchButtonRef.current?.contains(target)) return;
      setSelectedCrew(null);
      setCrewSearchOpen(false);
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    return () => document.removeEventListener("pointerdown", closeWhenOutside);
  }, [selectedCrew, crewSearchOpen]);

  useLayoutEffect(() => {
    if (!selectedCrew && !crewSearchOpen) return;
    const stage = crewStageRef.current;
    const rail = crewRailRef.current;
    const tab = selectedPersonRef.current;
    const panel = activityPanelRef.current;
    const svg = outlineSvgRef.current;
    const path = outlinePathRef.current;
    if (!stage || !rail || !tab || !panel || !svg || !path) return;

    let frame = 0;
    const draw = () => {
      const stageRect = stage.getBoundingClientRect();
      const railRect = rail.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const left = panelRect.left - stageRect.left + 1;
      const right = panelRect.right - stageRect.left - 1;
      const top = panelRect.top - stageRect.top + 1;
      const bottom = panelRect.bottom - stageRect.top - 1;
      const radius = 18;
      const tabIsVisible = tabRect.right > railRect.left + 3 && tabRect.left < railRect.right - 3;
      const tabLeft = Math.max(left, tabRect.left - stageRect.left + 1);
      const tabRight = Math.min(right, tabRect.right - stageRect.left - 1);
      const tabTop = tabRect.top - stageRect.top + 1;
      const joinRight = Math.min(12, (right - radius - tabRight) / 2);
      const joinLeft = Math.min(12, (tabLeft - left - radius) / 2);
      const rightEdgeJoin = joinRight < 3 && tabRight >= right - radius - 6;
      const connected = tabIsVisible && tabRight - tabLeft > 30 && tabTop < top - radius && (joinRight >= 3 || rightEdgeJoin);
      let outline = "";
      if (connected) {
        outline = rightEdgeJoin
          ? `M ${left + radius} ${bottom} H ${right - radius} Q ${right} ${bottom} ${right} ${bottom - radius} V ${tabTop + radius} Q ${right} ${tabTop} ${right - radius} ${tabTop} H ${tabLeft + radius} Q ${tabLeft} ${tabTop} ${tabLeft} ${tabTop + radius}`
          : `M ${left + radius} ${bottom} H ${right - radius} Q ${right} ${bottom} ${right} ${bottom - radius} V ${top + radius} Q ${right} ${top} ${right - radius} ${top} H ${tabRight + joinRight} Q ${tabRight} ${top} ${tabRight} ${top - joinRight} V ${tabTop + radius} Q ${tabRight} ${tabTop} ${tabRight - radius} ${tabTop} H ${tabLeft + radius} Q ${tabLeft} ${tabTop} ${tabLeft} ${tabTop + radius}`;
        if (tabLeft <= left + 4) {
          outline += ` V ${bottom - radius} Q ${left} ${bottom} ${left + radius} ${bottom} Z`;
        } else if (joinLeft >= 3) {
          // Connect the panel's left edge to the selected card, leaving only
          // the section directly beneath that card open.
          outline += ` V ${top - joinLeft} Q ${tabLeft} ${top} ${tabLeft - joinLeft} ${top} H ${left + radius} Q ${left} ${top} ${left} ${top + radius} V ${bottom - radius} Q ${left} ${bottom} ${left + radius} ${bottom} Z`;
        } else {
          const smallJoin = Math.max(2, (tabLeft - left) / 2);
          outline += ` V ${top - smallJoin} Q ${tabLeft} ${top} ${left} ${top} V ${bottom - radius} Q ${left} ${bottom} ${left + radius} ${bottom} Z`;
        }
      }
      svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
      path.setAttribute("d", outline);
    };
    const scheduleDraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    const initialTab = tab.getBoundingClientRect();
    const initialRail = rail.getBoundingClientRect();
    const initialPanel = panel.getBoundingClientRect();
    if ((initialTab.right > initialPanel.right - 30 || initialTab.left < initialPanel.left) && typeof rail.scrollTo === "function") {
      rail.scrollTo({
        left: rail.scrollLeft + initialTab.left - initialRail.left - 4,
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    }
    draw();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleDraw) : null;
    if (observer) {
      observer.observe(stage);
      observer.observe(rail);
      observer.observe(tab);
      observer.observe(panel);
    }
    rail.addEventListener("scroll", scheduleDraw, { passive: true });
    window.addEventListener("resize", scheduleDraw);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      rail.removeEventListener("scroll", scheduleDraw);
      window.removeEventListener("resize", scheduleDraw);
    };
  }, [selectedCrew, crewSearchOpen]);

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
    setSelectedCrew(null);
    setCrewSearchOpen((current) => !current);
  }

  function closeCrewSearch() {
    setCrewSearchOpen(false);
  }

  function toggleCrewPrizes(name: (typeof people)[number]["name"]) {
    setCrewSearchOpen(false);
    setSelectedCrew((current) => current === name ? null : name);
  }

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
            <button ref={crewSearchButtonRef} className={styles.outlineButton} type="button" onClick={openCrewSearch} aria-expanded={crewSearchOpen}>
              Add to Your Crew <span aria-hidden="true">→</span>
            </button>
            <div className={styles.arrows} aria-label="Crew carousel controls">
              <button type="button" aria-label="Previous Crew profiles" onClick={() => moveRail(crewRailRef.current, -1)}>‹</button>
              <button type="button" aria-label="Next Crew profiles" onClick={() => moveRail(crewRailRef.current, 1)}>›</button>
            </div>
          </div>
        </div>

        <div className={styles.crewOutlineStage} ref={crewStageRef}>
        <div className={styles.peopleRail} ref={crewRailRef} aria-label="Fictional sample Crew profiles" onDragStart={(event) => event.preventDefault()} {...crewDrag}>
          {people.map((person) => {
            const requested = previewRequests.includes(person.name);
            return (
              <div ref={selectedCrew === person.name ? (node) => { selectedPersonRef.current = node; } : undefined} className={`${styles.person} ${selectedCrew === person.name ? styles.personSelected : ""}`} key={person.name}>
                <button type="button" className={styles.avatar} aria-label={`See ${person.name}'s prizes`} aria-expanded={selectedCrew === person.name} onClick={() => toggleCrewPrizes(person.name)}>
                  <Image src={person.photo} alt={`Fictional profile of ${person.name}`} draggable={false} fill sizes="(max-width: 640px) 88px, 112px" className={styles.avatarImage} />
                </button>
                <button type="button" className={styles.personName} aria-expanded={selectedCrew === person.name} onClick={() => toggleCrewPrizes(person.name)}>{person.name}</button>
                <button className={`${styles.addButton} ${requested ? styles.addButtonSelected : ""}`} type="button" onClick={() => previewCrewRequest(person.name)}>
                  {requested ? "Preview added" : "Add to Crew"}
                </button>
                <button className={styles.sharedButton} type="button" aria-expanded={selectedCrew === person.name} onClick={() => toggleCrewPrizes(person.name)}>
                  {selectedCrew === person.name ? "Hide prizes" : "See prizes"} <span aria-hidden="true">{selectedCrew === person.name ? "↑" : "↓"}</span>
                </button>
              </div>
            );
          })}
          <button ref={crewSearchOpen ? (node) => { selectedPersonRef.current = node; } : undefined} className={`${styles.discoverPerson} ${crewSearchOpen ? styles.discoverSelected : ""}`} type="button" onClick={openCrewSearch} aria-label="Add to Your Crew" aria-expanded={crewSearchOpen}>
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
        {selectedCrew ? <SharedPicksConcept key={selectedCrew} person={selectedCrew} onClose={() => setSelectedCrew(null)} connectedOutline panelRef={activityPanelRef} /> : null}
        {crewSearchOpen ? <CrewDiscoveryPanel onClose={closeCrewSearch} outerPanelRef={activityPanelRef} /> : null}
        {selectedCrew || crewSearchOpen ? <svg ref={outlineSvgRef} className={`${styles.crewOutline} ${crewSearchOpen ? styles.crewOutlineOrange : ""}`} aria-hidden="true" preserveAspectRatio="none"><path ref={outlinePathRef} fill="none" stroke={crewSearchOpen ? "#ff7417" : "#67f768"} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg> : null}
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
    </div>
  );
}
