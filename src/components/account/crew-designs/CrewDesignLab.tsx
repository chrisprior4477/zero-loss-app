"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getCrewSharedPicks } from "@/lib/crew/actions";
import { featuredCrewPeople, sampleCrewPeople, type SampleCrewName } from "@/lib/crew/sample-preview";
import { samplePicks } from "@/components/home/SharedPicksConcept";
import { ProductShareButton } from "@/components/product/ProductShareButton";
import { PRODUCT_SHARE_EVENT } from "@/lib/sharing/product-share";
import { ShareIcon } from "@/components/product/ShareIcon";
import { CrewInlineFinder } from "./CrewInlineFinder";
import { creatorCategories, crewDesigns, type CrewDesignProduct, type CrewDesignProps, type DesignMember } from "./designs";
import styles from "./crew-designs.module.css";

type PicksState = { state: "loading" | "ready" | "error"; picks: CrewDesignProduct[] };
const sampleId = (name: string) => `sample-${name}`;
const allSamples: DesignMember[] = sampleCrewPeople.map((person, index) => ({ id: sampleId(person.name), name: person.name, photo: person.photo, sample: true, category: creatorCategories[index % creatorCategories.length] }));
const dateLabel = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));

function Avatar({ person, large = false }: { person: DesignMember; large?: boolean }) {
  return <span aria-hidden="true" className={large ? styles.largeAvatar : styles.avatar}>{person.photo ? <Image src={person.photo} alt="" fill sizes={large ? "240px" : "96px"} unoptimized={!person.sample} /> : <span>{person.name.slice(0, 1).toUpperCase()}</span>}</span>;
}

function PersonButton({ person, selected, onSelect, count, compact = false }: { person: DesignMember; selected: boolean; onSelect: () => void; count?: number; compact?: boolean }) {
  return <button type="button" className={`${styles.personCard} ${compact ? styles.compactPerson : ""}`} data-selected={selected} aria-pressed={selected} aria-label={`See ${person.name}’s shared picks`} onClick={onSelect}>
    <Avatar person={person} /><span className={styles.personText}><strong>{person.name}</strong><small>{person.sample ? `${count ?? 0} sample picks` : count === undefined ? "Connected" : `${count} shared picks`}</small></span>
    {selected ? <span className={styles.selectedMark} aria-hidden="true">✓</span> : null}
  </button>;
}

function PeopleRail({ people, selected, onSelect, getPicks }: { people: DesignMember[]; selected: string; onSelect: (person: DesignMember) => void; getPicks: (person: DesignMember) => CrewDesignProduct[] | undefined }) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false, scrollable: false });
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => setEdges({ start: element.scrollLeft < 4, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 4, scrollable: element.scrollWidth > element.clientWidth + 4 });
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update); observer.observe(element);
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [people.length]);
  const move = (direction: number) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .7, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  return <div className={styles.peopleSection}>
    <div className={styles.sectionHeading}><h2>Your people</h2>{edges.scrollable ? <div className={styles.railTools}><span>Swipe to explore</span><button type="button" aria-label="Previous people" disabled={edges.start} onClick={() => move(-1)}>←</button><button type="button" aria-label="More people" disabled={edges.end} onClick={() => move(1)}>→</button></div> : <small>{people.length} people</small>}</div>
    <div ref={rail} className={styles.peopleRail} aria-label="Your Crew people">{people.map(person => <PersonButton key={person.id} person={person} selected={selected === person.id} onSelect={() => onSelect(person)} count={getPicks(person)?.length} />)}</div>
  </div>;
}

function ProductCard({ product, children, compact = false }: { product: CrewDesignProduct; children?: ReactNode; compact?: boolean }) {
  return <article className={`${styles.productCard} ${compact ? styles.productCompact : ""}`}>
    {children}
    <Link href={`/items/${encodeURIComponent(product.slug)}`} className={styles.productArt} aria-label={`View ${product.title}`}><Image src={product.image} alt={product.title} fill sizes="(max-width: 640px) 180px, 300px" /></Link>
    <div className={styles.productCopy}><span className={styles.retailer}>{product.retailer}</span><h3>{product.title}</h3>{product.note ? <p>{product.note}</p> : null}</div>
    <div className={styles.productActions}><Link href={`/items/${encodeURIComponent(product.slug)}`} className={styles.productOpen}>View item <span aria-hidden="true">↗</span></Link><ProductShareButton product={product} label="Share" className={styles.shareButton} /></div>
  </article>;
}

function PersonHeading({ person, count, onShare }: { person: DesignMember; count?: number; onShare: () => void }) {
  return <header className={styles.personHeading}><Avatar person={person} /><div><span className={styles.eyebrow}>{person.sample ? "SAMPLE PROFILE" : "YOUR CREW"}</span><h2>{person.name}’s shared picks</h2><p>{count === undefined ? "Only what they choose to share." : `${count} ${count === 1 ? "find" : "finds"} to explore`}</p></div><button type="button" className={styles.headingShare} onClick={onShare}><ShareIcon name="share" /><span>Share a find</span></button></header>;
}

export function CrewDesignLab({ initialDesign, members, ownProducts, automotive, available, pendingRequests }: CrewDesignProps) {
  const [design, setDesign] = useState(initialDesign);
  const [studioOpen, setStudioOpen] = useState(true);
  const [tuning, setTuning] = useState(false);
  const [width, setWidth] = useState("full");
  const [peopleStyle, setPeopleStyle] = useState("default");
  const [pickStyle, setPickStyle] = useState("cards");
  const [density, setDensity] = useState("comfortable");
  const [shortlist, setShortlist] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState(sampleId("Maya"));
  const [sampleNames, setSampleNames] = useState<string[]>(featuredCrewPeople.map(person => person.name));
  const [loaded, setLoaded] = useState<Record<string, PicksState>>({});
  const pendingLoads = useRef(new Set<string>());
  const [finder, setFinder] = useState(false);
  const finderRef = useRef<HTMLDivElement>(null);
  const [sharePicker, setSharePicker] = useState(false);
  const [feedFilter, setFeedFilter] = useState("all");
  const [feedCount, setFeedCount] = useState(6);
  const [shelf, setShelf] = useState<string | null>(null);
  const [deskSlug, setDeskSlug] = useState(ownProducts[0]?.slug ?? samplePicks.Maya[0].slug);
  const [category, setCategory] = useState("All");
  const [topCount, setTopCount] = useState(5);
  const [following, setFollowing] = useState<string[]>([]);
  const [discoveryMode, setDiscoveryMode] = useState("discover");
  const [creator, setCreator] = useState<string | null>(null);
  const direction = crewDesigns[design - 1];
  const people = [...members, ...allSamples.filter(person => sampleNames.includes(person.name))];
  const selected = people.find(person => person.id === selectedId) ?? people[0];
  const productChoices = [...new Map([...ownProducts, ...Object.values(samplePicks).flat()].map(product => [product.slug, product as CrewDesignProduct])).values()];
  const deskProduct = productChoices.find(product => product.slug === deskSlug) ?? productChoices[0];

  useEffect(() => {
    const restore = () => { const next = Number(new URL(window.location.href).searchParams.get("design")); if (Number.isInteger(next) && next >= 1 && next <= 8) setDesign(next); };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  useEffect(() => {
    if (finder) { finderRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" }); finderRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }); }
  }, [finder]);

  function changeDesign(id: number) {
    setDesign(id); setFinder(false); setSharePicker(false); setPeopleStyle("default"); setPickStyle("cards"); setDensity("comfortable");
    const url = new URL(window.location.href); url.searchParams.set("design", String(id)); window.history.replaceState(null, "", url);
  }

  function picksFor(person: DesignMember): CrewDesignProduct[] | undefined {
    if (person.sample) return samplePicks[person.name as SampleCrewName];
    return loaded[person.id]?.state === "ready" ? loaded[person.id].picks : undefined;
  }

  const loadPerson = useCallback(async (person: DesignMember, retry = false) => {
    if (person.sample || pendingLoads.current.has(person.id) || (!retry && loaded[person.id])) return;
    pendingLoads.current.add(person.id); setLoaded(current => ({ ...current, [person.id]: { state: "loading", picks: [] } }));
    try {
      const result = await getCrewSharedPicks(person.id);
      setLoaded(current => ({ ...current, [person.id]: { state: result.ok ? "ready" : "error", picks: result.picks.map(pick => ({ title: pick.title, retailer: pick.retailer, image: pick.image, slug: pick.offeringSlug, note: `Shared ${dateLabel(pick.sharedAt)}` })) } }));
    } catch { setLoaded(current => ({ ...current, [person.id]: { state: "error", picks: [] } })); }
    finally { pendingLoads.current.delete(person.id); }
  }, [loaded]);

  useEffect(() => {
    if (design === 3 || design === 4) members.forEach(person => { void loadPerson(person); });
  }, [design, members, loadPerson]);

  function select(person: DesignMember) { setSelectedId(person.id); void loadPerson(person); }
  function openShare() { setSharePicker(true); }
  function addSample(name: SampleCrewName) { setSampleNames(current => [...new Set([...current, name])]); setSelectedId(sampleId(name)); setFinder(false); }
  function movePerson(step: number) { const index = people.findIndex(person => person.id === selected.id); select(people[(index + step + people.length) % people.length]); }

  const selectedPicks = picksFor(selected);
  function missingPicks(person: DesignMember) {
    const state = loaded[person.id]?.state;
    return <div className={styles.emptyState} role={state === "error" ? "alert" : "status"}><ShareIcon name="crew" /><strong>{state === "loading" ? "Loading shared picks…" : state === "error" ? "These picks couldn’t load." : "Their next find could start here."}</strong><p>{state === "error" ? "Your connection is still saved." : "Only picks this person chooses to share appear here."}</p>{state === "error" || !state ? <button type="button" className={styles.blueButton} onClick={() => void loadPerson(person, true)}>View shared picks</button> : state === "ready" ? <button type="button" className={styles.orangeButton} onClick={openShare}>Share a find</button> : null}</div>;
  }
  function selectedPanel() {
    return <section className={styles.activityPanel} aria-label={`${selected.name}’s shared activity`}><PersonHeading person={selected} count={selectedPicks?.length} onShare={openShare} />{selectedPicks?.length ? <div className={styles.products}>{selectedPicks.map(product => <ProductCard key={product.slug} product={product} />)}</div> : missingPicks(selected)}</section>;
  }
  const rail = <PeopleRail people={people} selected={selected.id} onSelect={select} getPicks={picksFor} />;
  const allFeed = people.flatMap(person => (picksFor(person) ?? []).map((product, order) => ({ person, product, order }))).sort((a, b) => a.order - b.order);
  const feed = allFeed.filter(item => feedFilter === "all" || item.person.id === feedFilter);
  const creators = allSamples.filter(person => (category === "All" || person.category === category) && (discoveryMode !== "following" || following.includes(person.id))).slice(0, topCount);
  const focusedCreator = allSamples.find(person => person.id === creator);
  function creatorPicks(person: DesignMember): CrewDesignProduct[] {
    const byCategory: Record<string, CrewDesignProduct[]> = {
      Tech: [samplePicks.Maya[0], samplePicks.Daniel[0], samplePicks.Marcus[1]],
      Home: [samplePicks.Claire[0], samplePicks.Daniel[1], samplePicks.Owen[0]],
      Style: [samplePicks.Ari[0]],
      Automotive: automotive ? [automotive] : [],
      Everyday: [samplePicks.Ari[1], samplePicks.Sofia[0], samplePicks.Jules[0]],
    };
    return byCategory[person.category ?? ""] ?? samplePicks[person.name as SampleCrewName];
  }

  return <main className={styles.page}>
    <section className={styles.studio} aria-label="Crew design review" id="crew-designs">
      <div className={styles.studioTop}><div><span>CREW · EIGHT DIRECTIONS</span><strong>{design.toString().padStart(2, "0")} / {direction.name}</strong></div><div className={styles.studioTools}><button type="button" aria-expanded={studioOpen} onClick={() => setStudioOpen(!studioOpen)}>{studioOpen ? "Hide choices" : "Show 8 choices"}</button><Link href="/account/crew#crew-intro">Current Crew ↗</Link></div></div>
      {studioOpen ? <><nav className={styles.designChoices} aria-label="Choose a Crew design">{crewDesigns.map(choice => <button type="button" key={choice.id} onClick={() => changeDesign(choice.id)} aria-pressed={design === choice.id}><b>{choice.id.toString().padStart(2, "0")}</b><span>{choice.short}<small>{choice.group}</small></span>{shortlist.includes(choice.id) ? <i aria-label="Shortlisted">★</i> : null}</button>)}</nav>
        <div className={styles.designNote}><p><strong>{direction.description}</strong><span>{direction.strength}</span></p><button type="button" className={styles.shortlist} aria-pressed={shortlist.includes(design)} onClick={() => setShortlist(current => current.includes(design) ? current.filter(id => id !== design) : [...current, design])}>{shortlist.includes(design) ? "★ Shortlisted" : "☆ Shortlist"}</button></div>
        <div className={styles.reviewActions}><div className={styles.sizeSwitch}><button type="button" aria-pressed={width === "full"} onClick={() => setWidth("full")}>Full width</button><button type="button" aria-pressed={width === "phone"} onClick={() => setWidth("phone")}>Phone width</button></div><button type="button" aria-expanded={tuning} onClick={() => setTuning(!tuning)}>Adjust people & picks {tuning ? "−" : "+"}</button><details className={styles.research}><summary>What informed this</summary><div><p>People stay attached to the things they share. Inviting happens beside the result. Discovery is separate from private connections.</p><a href="https://www.airbnb.com/help/article/1236" target="_blank" rel="noreferrer">Airbnb: collaborative wishlists ↗</a><a href="https://help.pinterest.com/en-gb/article/group-boards" target="_blank" rel="noreferrer">Pinterest: find and invite in place ↗</a><a href="https://support.spotify.com/us/article/jam/" target="_blank" rel="noreferrer">Spotify: share the activity ↗</a><a href="https://support.strava.com/en-us/articles/15401967-what-are-strava-s-profile-page-privacy-controls" target="_blank" rel="noreferrer">Strava: public follows and private profiles ↗</a></div></details></div>
        {tuning ? <div className={styles.tuning}><label>People<select aria-label="People" value={peopleStyle} onChange={event => setPeopleStyle(event.target.value)}><option value="default">Original direction</option><option value="portraits">Larger portraits</option><option value="compact">Compact people</option></select></label><label>Shared picks<select aria-label="Shared picks" value={pickStyle} onChange={event => setPickStyle(event.target.value)}><option value="cards">Picture cards</option><option value="rows">Compact rows</option></select></label><label>Spacing<select aria-label="Spacing" value={density} onChange={event => setDensity(event.target.value)}><option value="comfortable">Comfortable</option><option value="tight">Tighter</option></select></label></div> : null}
        <p className={styles.reviewHint}>Connected people use your account. Named sample profiles are fictional. Discovery follows and rankings are a design preview.</p>
      </> : null}
    </section>

    <div className={`${styles.stage} ${width === "phone" ? styles.phoneWidth : ""}`} data-people={peopleStyle} data-picks={pickStyle} data-density={density}>
      <div className={styles.experience} data-design={design}>
        <header className={styles.pageHeading}><div><span className={styles.eyebrow}>{design === 8 ? "GOOD FINDS. INTERESTING PEOPLE." : design === 7 ? "THIS MADE ME THINK OF YOU." : "BETTER FINDS, TOGETHER."}</span><h1>{design === 8 ? "Discover your people." : design === 7 ? "Pass something good on." : "Your Crew"}</h1><p>{design === 8 ? "Follow the interests. Find the people." : design === 7 ? "One good find is all it takes to start a conversation." : "The people you know. The finds you’ll love."}</p></div><button type="button" className={styles.orangeButton} onClick={() => setFinder(!finder)} aria-expanded={finder}><ShareIcon name="crew" /><span>Add people</span></button></header>
        {finder ? <div ref={finderRef}><CrewInlineFinder available={available} onSample={addSample} onClose={() => setFinder(false)} /></div> : null}
        <nav className={styles.mainNav} aria-label="Crew shortcuts"><Link href={`/account/crew?design=${design}`} aria-current="page">{design === 8 ? "Discover" : "Your people"}<small>{design === 8 ? "Preview" : members.length + sampleNames.length}</small></Link><Link href="/account/favorites?tab=shared">Shared with you <span>↗</span></Link><Link href="/account/crew?tab=requests">Requests{pendingRequests ? <small>{pendingRequests}</small> : null}</Link><details className={styles.moreMenu}><summary>More <span aria-hidden="true">⌄</span></summary><div><Link href="/account/crew?tab=picks">My shared picks</Link><Link href="/account/crew?tab=groups">Groups</Link><Link href="/account/crew?tab=privacy">Privacy & settings</Link></div></details></nav>
        {!available ? <p role="alert" className={styles.notice}>Your saved Crew couldn’t load. Sample profiles are still available to explore these layouts.</p> : null}

        {design === 1 ? <div className={styles.connectedSpace}>{rail}{selectedPanel()}</div> : null}

        {design === 2 ? <div className={styles.splitView}><aside className={styles.peopleSidebar}><div className={styles.sectionHeading}><h2>Your people</h2><small>{people.length}</small></div><div className={styles.sidebarPeople}>{people.map(person => <PersonButton compact key={person.id} person={person} selected={selected.id === person.id} count={picksFor(person)?.length} onSelect={() => select(person)} />)}</div><button type="button" className={styles.sidebarAdd} onClick={() => setFinder(true)}>+ Add someone</button></aside>{selectedPanel()}</div> : null}

        {design === 3 ? <div className={styles.feedLayout}><aside className={styles.feedAside}><h2>People worth checking in on.</h2><p>A good find starts with someone you know.</p><button type="button" className={styles.orangeButton} onClick={openShare}>Share a find <ShareIcon name="share" /></button><div className={styles.miniPeople}>{people.map(person => <button type="button" key={person.id} onClick={() => { select(person); setFeedFilter(person.id); }}><Avatar person={person} /><span>{person.name}</span></button>)}</div></aside><section className={styles.feedMain} aria-label="Crew shared feed"><div className={styles.feedFilters}><button type="button" aria-pressed={feedFilter === "all"} onClick={() => setFeedFilter("all")}>Everyone</button>{people.map(person => <button type="button" key={person.id} aria-pressed={feedFilter === person.id} onClick={() => { select(person); setFeedFilter(person.id); }}><Avatar person={person} />{person.name}</button>)}</div><div className={styles.feedGrid}>{feed.slice(0, feedCount).map(({ person, product }, index) => <ProductCard key={`${person.id}-${product.slug}-${index}`} product={product}><button type="button" className={styles.feedAuthor} onClick={() => { select(person); setFeedFilter(person.id); }}><Avatar person={person} /><span><strong>{person.name}</strong><small>{person.sample ? "Sample shared pick" : "Shared with your Crew"}</small></span><span aria-hidden="true">↗</span></button></ProductCard>)}</div>{!feed.length ? missingPicks(selected) : null}{feed.length > feedCount ? <button type="button" className={styles.loadMore} onClick={() => setFeedCount(count => count + 6)}>More from your Crew ↓</button> : null}</section></div> : null}

        {design === 4 ? <div className={styles.shelves}>{people.map(person => { const picks = picksFor(person); return <section key={person.id} className={styles.friendShelf} aria-label={`${person.name}’s shelf`}><div className={styles.shelfHeading}><Avatar person={person} /><div><h2>{person.name}’s corner</h2><p>{person.sample ? "Sample finds for a little inspiration" : "Picks shared with you"}</p></div><button type="button" onClick={() => { select(person); setShelf(shelf === person.id ? null : person.id); }}>{shelf === person.id ? "Show less" : "See picks"} →</button></div>{picks?.length ? <div className={`${styles.shelfProducts} ${shelf === person.id ? styles.expandedShelf : ""}`}>{picks.map(product => <ProductCard key={product.slug} product={product} />)}</div> : missingPicks(person)}</section>; })}</div> : null}

        {design === 5 ? <div className={styles.spotlightLayout}><section className={styles.spotlight} aria-label="Crew spotlight"><div className={styles.spotlightPerson}><span className={styles.eyebrow}>IN THE SPOTLIGHT</span><Avatar person={selected} large /><h2>{selected.name}’s next great find.</h2><p>{selected.sample ? "A sample look at what caught their eye." : "Something they chose to share with you."}</p><div className={styles.spotlightArrows}><button type="button" onClick={() => movePerson(-1)} aria-label="Previous person">←</button><span>{people.findIndex(person => person.id === selected.id) + 1} / {people.length}</span><button type="button" onClick={() => movePerson(1)} aria-label="Next person">→</button></div></div><div className={styles.spotlightItem}>{selectedPicks?.[0] ? <ProductCard product={selectedPicks[0]} /> : missingPicks(selected)}</div></section>{rail}{selectedPicks && selectedPicks.length > 1 ? <section className={styles.spotlightMore}><div className={styles.sectionHeading}><h2>More from {selected.name}</h2><button type="button" onClick={openShare}>Send a find back ↗</button></div><div className={styles.products}>{selectedPicks.slice(1).map(product => <ProductCard key={product.slug} product={product} />)}</div></section> : null}</div> : null}

        {design === 6 ? <div className={styles.inbox}><aside className={styles.inboxPeople}><div className={styles.sectionHeading}><h2>Your pick exchanges</h2></div><div className={styles.inboxList}>{people.map(person => <button type="button" key={person.id} className={styles.inboxPerson} aria-pressed={selected.id === person.id} onClick={() => select(person)}><Avatar person={person} /><span><strong>{person.name}</strong><small>{picksFor(person)?.[0]?.title ?? "See shared finds"}</small></span><b>{picksFor(person)?.length ?? "↗"}</b></button>)}</div></aside><section className={styles.pickThread} aria-label={`Picks with ${selected.name}`}><PersonHeading person={selected} count={selectedPicks?.length} onShare={openShare} /><p className={styles.threadDate}>{selected.sample ? "Sample pick exchange" : "Shared picks · no private messages"}</p><div className={styles.threadItems}>{selectedPicks?.length ? selectedPicks.map(product => <div className={styles.pickMessage} key={product.slug}><Avatar person={selected} /><ProductCard compact product={product} /></div>) : missingPicks(selected)}</div><button type="button" className={styles.threadCompose} onClick={openShare}><span>Have a find to share back?</span><ShareIcon name="share" /></button></section></div> : null}

        {design === 7 ? <div className={styles.sharingDesk}><section className={styles.deskPicker}><div className={styles.stepLabel}><b>1</b><span>Pick something worth sharing</span></div><div className={styles.deskChoices}>{productChoices.slice(0, 8).map(product => <button type="button" key={product.slug} aria-pressed={deskProduct.slug === product.slug} onClick={() => setDeskSlug(product.slug)}><span><Image src={product.image} alt="" fill sizes="160px" /></span><strong>{product.title}</strong></button>)}</div><Link href="/browse">Find something else in the marketplace ↗</Link></section><section className={styles.deskCompose}><div className={styles.stepLabel}><b>2</b><span>Make someone’s day</span></div><div className={styles.deskPostcard}><span className={styles.postcardStamp}>A FIND FROM<br />YOUR CREW</span><div className={styles.postcardArt}><Image src={deskProduct.image} alt={deskProduct.title} fill sizes="400px" /></div><span className={styles.eyebrow}>{deskProduct.retailer}</span><h2>{deskProduct.title}</h2><p>“Saw this and thought of you.”</p><ProductShareButton product={deskProduct} label="Choose where to share" className={styles.deskShare} /><small>Email, message, copy a link, or share with Crew.</small></div><div className={styles.deskPeople}><span>Someone in mind?</span><div>{people.slice(0, 5).map(person => <button type="button" key={person.id} onClick={() => { select(person); changeDesign(1); }} aria-label={`See ${person.name}’s picks before sharing`}><Avatar person={person} /><span>{person.name}</span></button>)}<button type="button" onClick={() => setFinder(true)} className={styles.addCircle}><b>+</b><span>Add someone</span></button></div></div></section></div> : null}

        {design === 8 ? <section className={styles.discovery} aria-label="Discover sample creators"><div className={styles.discoveryLead}><div><span className={styles.eyebrow}>YOUR NEXT GOOD FIND STARTS WITH A PERSON</span><h2>You don’t have to know them<br />to love their taste.</h2><p>Explore public picks. Follow what interests you.</p></div><div className={styles.creatorCollage}>{allSamples.slice(0, 4).map(person => <Avatar key={person.id} person={person} />)}</div></div><div className={styles.discoveryControls}><div className={styles.segmented}><button type="button" aria-pressed={discoveryMode === "discover"} onClick={() => setDiscoveryMode("discover")}>Discover</button><button type="button" aria-pressed={discoveryMode === "following"} onClick={() => setDiscoveryMode("following")}>Following {following.length || ""}</button></div><label>Show<select aria-label="Creator list size" value={topCount} onChange={event => setTopCount(Number(event.target.value))}>{[5, 10, 25].map(count => <option key={count} value={count}>Top {count}</option>)}</select></label></div><div className={styles.categoryRail} aria-label="Creator categories">{["All", ...creatorCategories].map(name => <button type="button" key={name} aria-pressed={category === name} onClick={() => { setCategory(name); setCreator(null); }}>{name}</button>)}</div><div className={styles.discoveryLabel}><h2>{category === "All" ? "People to discover" : `${category} people to discover`}</h2><span>{creators.length} sample creators · this week</span></div><div className={styles.creators}>{creators.map((person, index) => <article key={person.id} className={styles.creatorCard} data-expanded={creator === person.id}><button type="button" className={styles.creatorIdentity} aria-expanded={creator === person.id} onClick={() => setCreator(creator === person.id ? null : person.id)}><span className={styles.rank}>{index + 1}</span><Avatar person={person} /><span><strong>{person.name}</strong><small>{person.category} finds</small></span><span aria-hidden="true">↗</span></button><div className={styles.creatorPreview}>{creatorPicks(person).slice(0, 2).map(product => <Link key={product.slug} href={`/items/${product.slug}`} aria-label={`View ${product.title}`}><Image src={product.image} alt={product.title} fill sizes="150px" /></Link>)}</div><div className={styles.creatorFooter}><span><b>{42 - allSamples.indexOf(person) * 2}</b> sample picks this week</span><button type="button" className={following.includes(person.id) ? styles.followingButton : styles.followButton} aria-pressed={following.includes(person.id)} onClick={() => setFollowing(current => current.includes(person.id) ? current.filter(id => id !== person.id) : [...current, person.id])}>{following.includes(person.id) ? "Following ✓" : "+ Follow"}</button></div>{focusedCreator?.id === person.id ? <section className={styles.creatorDetails} aria-label={`${focusedCreator.name}’s sample public picks`}><PersonHeading person={focusedCreator} count={creatorPicks(focusedCreator).length} onShare={openShare} /><div className={styles.products}>{creatorPicks(focusedCreator).map(product => <ProductCard key={product.slug} product={product} />)}</div></section> : null}</article>)}</div>{!creators.length ? <div className={styles.emptyState}><strong>{discoveryMode === "following" ? "Your next favorite person is out there." : "Try another interest."}</strong><button type="button" className={styles.orangeButton} onClick={() => { setDiscoveryMode("discover"); setCategory("All"); }}>Discover people</button></div> : null}<p className={styles.discoveryNotice}>Discovery preview: fictional creators and illustrative activity counts. Following here previews the experience; it does not add a private Crew connection.</p></section> : null}

        {design !== 7 && design !== 8 ? <section className={styles.inviteStrip}><span className={styles.inviteArt}><ShareIcon name="share" /></span><div><strong>Good finds are better shared.</strong><p>Send something they’ll actually want to open.</p></div><button type="button" onClick={openShare}>Share a find <span aria-hidden="true">→</span></button></section> : null}
        <p className={styles.privacyNote}>{members.length} connected · {sampleNames.length} fictional sample profiles. Your private entries and wallet are never shown here.</p>
      </div>
    </div>
    {sharePicker ? <SharePicker products={productChoices} onClose={() => setSharePicker(false)} /> : null}
  </main>;
}

function SharePicker({ products, onClose }: { products: CrewDesignProduct[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className={styles.shareDialog} aria-labelledby="crew-share-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className={styles.dialogHeading}><div><span className={styles.eyebrow}>PASS IT ON</span><h2 id="crew-share-title">What caught your eye?</h2></div><button type="button" aria-label="Close share picker" onClick={onClose}>×</button></div><p>Choose a find, then choose who to share it with.</p><div className={styles.shareChoices}>{products.map(product => <div className={styles.shareChoice} key={product.slug}><span><Image src={product.image} alt="" fill sizes="90px" /></span><div><small>{product.retailer}</small><strong>{product.title}</strong></div><button type="button" className={styles.shareButton} onClick={() => { dialog.current?.close(); onClose(); window.dispatchEvent(new CustomEvent(PRODUCT_SHARE_EVENT, { detail: product })); }}><ShareIcon name="share" /> Share</button></div>)}</div></dialog>;
}
