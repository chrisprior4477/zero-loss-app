"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import styles from "./CrewAndWinnerPreview.module.css";

const people = [
  { name: "Maya", photo: "/images/home/crew/person-1.webp" },
  { name: "Daniel", photo: "/images/home/crew/person-2.webp" },
  { name: "Ari", photo: "/images/home/crew/person-3.webp" },
  { name: "Leo", photo: "/images/home/crew/person-4.webp" },
  { name: "Claire", photo: "/images/home/crew/person-5.webp" },
  { name: "Marcus", photo: "/images/home/crew/person-6.webp" },
] as const;

const storyPreviews = [
  { title: "A TV day at home", category: "Home & entertainment", photo: "/images/home/winner-previews/story-1.webp" },
  { title: "The sneaker moment", category: "Style & sneakers", photo: "/images/home/winner-previews/story-2.webp" },
  { title: "A coffee worth sharing", category: "Everyday favorites", photo: "/images/home/winner-previews/story-3.webp" },
  { title: "A fresh pair", category: "Style & sneakers", photo: "/images/home/winner-previews/story-4.webp" },
  { title: "Something for the family", category: "Home & entertainment", photo: "/images/home/winner-previews/story-5.webp" },
  { title: "The little wins", category: "Everyday favorites", photo: "/images/home/winner-previews/story-6.webp" },
] as const;

export function CrewAndWinnerPreview() {
  const railRef = useRef<HTMLDivElement>(null);
  const [previewRequests, setPreviewRequests] = useState<string[]>([]);
  const [crewMessage, setCrewMessage] = useState("");
  const [selectedStory, setSelectedStory] = useState<number | null>(null);

  function previewCrewRequest(name: string) {
    setPreviewRequests((current) => current.includes(name) ? current : [...current, name]);
    setCrewMessage(`Preview only: no invitation was sent to ${name}. A real Crew connection would require their approval.`);
  }

  function moveStories(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.82, behavior: "smooth" });
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
          <button className={styles.outlineButton} type="button" onClick={() => setCrewMessage("Preview only: search and invitations will be available when Crew is launched. Connections and shared picks will require both people to opt in.")}>
            Find more people <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className={styles.peopleRail} aria-label="Fictional sample Crew profiles">
          {people.map((person) => {
            const requested = previewRequests.includes(person.name);
            return (
              <div className={styles.person} key={person.name}>
                <div className={styles.avatar}>
                  <Image src={person.photo} alt={`Fictional profile of ${person.name}`} fill sizes="(max-width: 640px) 88px, 112px" className={styles.avatarImage} />
                </div>
                <strong className={styles.personName}>{person.name}</strong>
                <button className={`${styles.addButton} ${requested ? styles.addButtonSelected : ""}`} type="button" onClick={() => previewCrewRequest(person.name)}>
                  {requested ? "Preview added" : "Add to Crew"}
                </button>
                <button className={styles.sharedButton} type="button" onClick={() => setCrewMessage(`Preview only: ${person.name}'s picks would appear here only after you both connect and ${person.name} chooses to share them.`)}>
                  Shared picks <span aria-hidden="true">→</span>
                </button>
              </div>
            );
          })}
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
            <button type="button" aria-label="Previous stories" onClick={() => moveStories(-1)}>‹</button>
            <button type="button" aria-label="Next stories" onClick={() => moveStories(1)}>›</button>
          </div>
        </div>
        <p className={styles.storyNotice}>Layout preview: these images feature fictional models, not actual winners. Verified, permission-based stories and videos will replace them.</p>

        <div className={styles.storyRail} ref={railRef} aria-label="Sample winner story cards">
          {storyPreviews.map((story, index) => (
            <button key={story.title} type="button" className={styles.storyCard} onClick={() => setSelectedStory(index)} aria-label={`Open illustrative story preview: ${story.title}`}>
              <Image src={story.photo} alt="Fictional lifestyle scene" fill sizes="(max-width: 640px) 86vw, (max-width: 900px) 45vw, 360px" className={styles.storyImage} />
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
