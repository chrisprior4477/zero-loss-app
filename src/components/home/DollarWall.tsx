"use client";

import { useEffect, useRef, useState } from "react";

type Category = "travel" | "gaming" | "theater" | "kitchen" | "outdoors";
type PhotoSheet = "main" | "travel" | "gaming" | "theater" | "kitchen" | "outdoors" | "kayak";
type Item = { id: string; name: string; category: Category; photo: number; sheet?: PhotoSheet };

const starters: Item[] = [
  ["getaway","Weekend Getaway","🏝️","travel"],["console","Game Console","🎮","gaming"],["tv","OLED Television","📺","theater"],["coffee","Espresso Machine","☕","kitchen"],["bike","Road Bike","🚲","outdoors"],["headphones","Premium Headphones","🎧","gaming"],["luggage","Travel Luggage","🧳","travel"],["grill","Outdoor Grill","♨️","outdoors"],["laptop","Lightweight Laptop","💻","gaming"],["camera","Action Camera","📷","travel"],["speaker","Wireless Speaker","🔊","theater"],["mixer","Stand Mixer","🥣","kitchen"],["watch","Smart Watch","⌚","outdoors"],["projector","Movie Projector","📽️","theater"],["vacuum","Robot Vacuum","🧹","kitchen"],["tent","Camping Tent","⛺","outdoors"],["tablet","Tablet","📱","gaming"],["spa","Spa Weekend","🧖","travel"],["oven","Pizza Oven","🍕","kitchen"],["soundbar","Cinema Soundbar","🎵","theater"],["kayak","Recreation Kayak","🛶","outdoors"],["airfare","Airline Reward","✈️","travel"],["chair","Gaming Chair","🪑","gaming"],["cookware","Cookware Set","🍳","kitchen"],
].map(([id,name,,category], photo) => ({ id, name, category: category as Category, photo }));

const suggestions: Record<Category, string[]> = {
  travel: ["Sandals|🩴","Swimsuit|🩱","Lounge Chair|🏖️","Travel Cooler|🧊","Airline Credit|✈️","Sunscreen Kit|🧴","Beach Towels|🌊","Resort Stay|🏨","Carry-On Bag|🧳","Travel Camera|📷","Sun Hat|👒","Beach Speaker|🔊","City Tour|🗺️","Dinner Credit|🍽️","Rental Car|🚗","Travel Pillow|😴","Water Shoes|👟","Snorkel Set|🤿","Portable Charger|🔋","Weekender Bag|🎒","Spa Credit|🧖","Sunglasses|🕶️","Picnic Set|🧺","Beach Umbrella|⛱️"],
  gaming: ["New Release Game|💿","Extra Controller|🎮","Gaming Headset|🎧","Gaming Chair|🪑","Charging Dock|🔋","Racing Wheel|🏎️","Game Store Credit|🎟️","LED Light Kit|💡","Streaming Camera|📹","Mechanical Keyboard|⌨️","Gaming Mouse|🖱️","Desk Mat|🟦","Arcade Stick|🕹️","Storage Drive|💾","Mini Fridge|🥤","Speaker Set|🔊","Monitor|🖥️","VR Headset|🥽","Microphone|🎙️","Controller Case|🧳","Beanbag Chair|🛋️","Cable Kit|🔌","Game Pass|🎫","Snack Box|🍿"],
  theater: ["Dolby Soundbar|🔊","Subwoofer|🎵","Streaming Box|📺","Wall Mount|🧰","Movie Night Card|🎬","Universal Remote|🎛️","LED Backlights|💡","Recliner|🛋️","Popcorn Maker|🍿","HDMI Cable Kit|🔌","Media Console|🗄️","Surround Speakers|🔉","Streaming Credit|🎟️","Projector|📽️","Sound Panels|◼️","Snack Bundle|🍫","Blanket Set|🧶","Smart Lights|🟣","TV Stand|🪑","Wireless Headphones|🎧","Game Console|🎮","Movie Collection|💿","Mini Fridge|🥤","Theater Setup|🛠️"],
  kitchen: ["Cookware Set|🍳","Coffee Grinder|🫘","Milk Frother|🥛","Mug Set|☕","Coffee Subscription|📦","Blender|🥤","Air Fryer|🍟","Knife Set|🔪","Serving Board|🧀","Food Storage|🥡","Toaster|🍞","Recipe Kit|📖","Kettle|🫖","Dinnerware|🍽️","Stand Mixer|🥣","Dutch Oven|🍲","Bakeware|🧁","Kitchen Towels|🧻","Pantry Credit|🛒","Spice Set|🧂","Water Filter|💧","Juicer|🍊","Waffle Maker|🧇","Cleaning Kit|🧽"],
  outdoors: ["Bike Helmet|⛑️","Hydration Pack|🎒","Fitness Watch|⌚","Trail Shoes|👟","Bike Rack|🚙","Tool Kit|🧰","Cycling Jersey|👕","Action Camera|📷","Portable Speaker|🔊","Cooler|🧊","Camping Chair|🪑","Tent|⛺","Travel Bottle|🚰","Sunglasses|🕶️","Picnic Set|🧺","Hiking Poles|🥢","Outdoor Grill|♨️","Lantern|🏮","Rain Jacket|🧥","Binoculars|🔭","First Aid Kit|🩹","Hammock|🌳","Park Pass|🎫","Power Station|🔋"],
};

const related = (category: Category): Item[] => suggestions[category].map((entry, index) => {
  const [name] = entry.split("|");
  return { id: `${category}-${index}`, name, category, photo: index, sheet: category };
});

const kayakNames = ["Life Vest","Kayak Paddle","Dry Bag","Polarized Sunglasses","Adventure Cooler","Action Camera","Water Shoes","Sun Hat","Sunscreen","Waterproof Phone Case","Water Bottle","Fishing Rod","First Aid Kit","Roof Kayak Rack","Paddle Gloves","Quick-Dry Shirt","Marine Speaker","Waterproof Watch","Bilge Pump","Kayak Anchor","Beach Towel","Camping Chair","Power Bank","Park Pass"];
const kayakItems = (): Item[] => kayakNames.map((name, photo) => ({ id: `kayak-${photo}`, name, category: "outdoors", photo, sheet: "kayak" }));

function photoPosition(photo: number) {
  const column = photo % 6;
  const row = Math.floor(photo / 6);
  return `${column * 20}% ${row * (100 / 3)}%`;
}

const sheetUrls: Record<PhotoSheet, string> = {
  main: "/dollar-wall-products-v2.png",
  travel: "/dollar-wall-travel-v2.png",
  gaming: "/dollar-wall-gaming-v1.png",
  theater: "/dollar-wall-theater-v2.png",
  kitchen: "/dollar-wall-kitchen-v2.png",
  outdoors: "/dollar-wall-outdoors-v2.png",
  kayak: "/dollar-wall-kayak-v2.png",
};

const solarOrbitPositions = [
  "5.8% 17%", "50% 17%", "94.2% 17%",
  "5.8% 52.1%", "50% 52.1%", "94.2% 52.1%",
  "5.8% 87%", "50% 87%", "94.2% 87%",
];

export function DollarWall() {
  const [items, setItems] = useState(starters);
  const [picks, setPicks] = useState<Item[]>([]);
  const [created, setCreated] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const mobileCreatedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!created || !window.matchMedia("(max-width: 767px)").matches) return;
    mobileCreatedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [created]);

  function pick(item: Item) {
    if (picks.length >= 5 || picks.some((chosen) => chosen.id === item.id)) return;
    const next = [...picks, item];
    setPicks(next);
    const replacements = (item.id === "kayak" ? kayakItems() : related(item.category)).filter((candidate) => !next.some((chosen) => chosen.id === candidate.id));
    let replacementIndex = 0;
    setItems((current) => current.map((candidate) => next.some((chosen) => chosen.id === candidate.id) ? candidate : replacements[replacementIndex++ % replacements.length]));
    setCreated(false);
    setRevealed(null);
  }
  function remove(item: Item) {
    setPicks((current) => current.filter((chosen) => chosen.id !== item.id));
    setCreated(false);
    setRevealed(null);
  }
  function reset() { setPicks([]); setItems(starters); setCreated(false); setRevealed(null); }

  function tap(item: Item) {
    if (picks.some((chosen) => chosen.id === item.id)) { remove(item); return; }
    if (revealed !== item.id) { setRevealed(item.id); return; }
    pick(item);
  }

  const bundleControls = (mobile = false) => <>
    <div className={`${mobile ? "order-2 mt-3" : ""} min-h-[100px] rounded-xl border border-cyan-300/20 bg-[#00132e]/65 p-3 shadow-[inset_0_0_22px_rgba(0,185,255,.06)]`}>
      <div className="flex justify-between"><h3 className="text-[11px] font-extrabold uppercase tracking-[.1em] text-cyan-300">Your bundle</h3><span className="text-[10px] text-white/45">{picks.length}/5</span></div>
      {picks.length ? <ul className="mt-2 space-y-1.5">{picks.map((item) => <li key={item.id} className="flex items-center justify-between gap-2 text-[10px] text-white/75"><span className="min-w-0 truncate"><span className="mr-1.5 text-[#74e72d]">✓</span>{item.name}</span><button type="button" onClick={() => remove(item)} aria-label={`Remove ${item.name}`} className="shrink-0 rounded-md border border-red-300/30 px-2 py-1 font-bold text-red-200 hover:bg-red-400/15">Remove</button></li>)}</ul> : <p className="mt-3 text-[10px] leading-relaxed text-white/40">Your picks will appear here.</p>}
    </div>
    <button type="button" disabled={picks.length < 2} onClick={() => setCreated(true)} className={`${mobile ? "order-1 mt-0" : "mt-3"} w-full rounded-lg bg-[#74e72d] px-3 py-2.5 text-[11px] font-extrabold text-[#00132e] enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35`}>Create bundle</button>
    {picks.length > 0 && <button type="button" onClick={reset} className={`${mobile ? "order-3" : ""} mt-3 w-full rounded-md border border-white/20 px-2 py-2 text-[10px] font-bold text-white/70 transition-colors hover:bg-white/10 md:border-cyan-200/45 md:bg-[#0759c9]/65 md:text-cyan-50 md:shadow-[inset_0_1px_0_rgba(174,242,255,.18)] md:hover:bg-[#087fe0]/75`}>Clear all</button>}
    {mobile && created && <div ref={mobileCreatedRef} className="order-4 mt-4 rounded-xl border border-[#74e72d]/35 bg-[#74e72d]/10 px-5 py-5 text-center"><strong className="text-sm text-[#9cf45c]">Your bundle is ready.</strong><p className="mt-1 text-[11px] text-white/65">{picks.map((item) => item.name).join(" + ")}</p><div className="mx-auto mt-4 flex max-w-md items-center justify-between rounded-lg bg-[#00132e]/70 px-4 py-3"><span className="text-xs text-white/65">{picks.length} items × $1</span><strong className="text-lg text-white">${picks.length} total</strong></div><button type="button" className="mt-3 rounded-lg bg-[#74e72d] px-6 py-2.5 text-xs font-extrabold text-[#00132e]">Enter ${picks.length}</button></div>}
  </>;

  return <section aria-labelledby="dollar-wall-title" className="relative overflow-hidden rounded-[22px] border border-cyan-200/55 bg-[radial-gradient(circle_at_15%_12%,rgba(0,185,255,.2),transparent_30%),radial-gradient(circle_at_88%_82%,rgba(139,92,246,.2),transparent_34%),linear-gradient(135deg,#041d42,#020d20_58%,#071936)] px-5 py-6 shadow-[0_18px_44px_rgba(0,0,0,.3),inset_0_1px_0_rgba(125,230,255,.1)] sm:px-7 lg:left-1/2 lg:w-screen lg:-translate-x-1/2 lg:rounded-none lg:border-0 lg:bg-[radial-gradient(ellipse_at_center,rgba(83,226,255,1)_0%,rgba(0,185,255,.96)_30%,rgba(7,135,232,.82)_58%,rgba(3,27,68,.18)_86%,transparent_100%),linear-gradient(180deg,#031b44_0%,#0759c9_15%,#15c9ff_50%,#0787e8_84%,#031b44_100%)] lg:px-[clamp(3rem,6vw,7rem)] lg:pb-[55px] lg:pt-[42px] lg:shadow-none">
    <svg aria-hidden="true" viewBox="0 0 1000 260" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block">
      <path d="M0 0h1000v12c-126-9-212 10-329 3C535 7 451 2 332 13 207 25 111 5 0 17Z" fill="#031b44" fillOpacity=".96" />
      <path d="M0 247c121 10 216-8 341-1 128 8 222 15 345 4 119-10 205 8 314-1v11H0Z" fill="#031b44" fillOpacity=".96" />
    </svg>
    <svg aria-hidden="true" viewBox="0 0 1000 260" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -top-6 hidden h-[calc(100%+48px)] w-full opacity-55 lg:block">
      <path d="M-40 72C120 16 214 128 370 74S626 16 782 76s214 40 292-3" fill="none" stroke="rgba(0,44,102,.72)" strokeWidth="24" strokeLinecap="round" />
      <path d="M-20 132c148-44 251 48 398 4s250-58 390-9 214 31 276-5" fill="none" stroke="rgba(0,65,140,.68)" strokeWidth="20" strokeLinecap="round" />
      <path d="M-55 210c151-70 274 32 413-9s267-74 397-18 233 56 321 7" fill="none" stroke="rgba(0,27,68,.78)" strokeWidth="36" strokeLinecap="round" />
      <path d="M-35 145c154-54 260 52 410 2s257-62 397-10 218 34 291-7" fill="none" stroke="rgba(0,226,255,.9)" strokeWidth="11" strokeLinecap="round" />
      <path d="M-25 168c147-43 255 39 401 0s250-50 389-5 216 25 281-10" fill="none" stroke="rgba(55,126,255,.88)" strokeWidth="8" strokeLinecap="round" />
      <path d="M90 151c119-27 210 31 326 3s204-37 321-3 167 20 224-5" fill="none" stroke="rgba(199,92,255,.58)" strokeWidth="4" strokeLinecap="round" />
      <path d="M135 177c104-24 188 24 295 1s190-31 297-2 152 18 207-3" fill="none" stroke="rgba(148,255,78,.5)" strokeWidth="3" strokeLinecap="round" />
      <path d="M-25 116c142-38 252 43 397 3s252-54 392-7 218 28 280-4" fill="none" stroke="rgba(205,246,255,.62)" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <svg aria-hidden="true" viewBox="0 0 1000 260" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -top-6 hidden h-[calc(100%+48px)] w-full lg:block">
      <defs>
        <filter id="dollar-wall-neon-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d="M-20 58C126 77 215 191 350 171S522 48 651 40 819 91 1020 70 M-20 120C88 211 207 191 321 141S497 174 611 105 759 209 871 180 953 139 1020 160 M-20 230C148 235 221 190 336 150S479 199 556 224 709 235 821 185 931 145 1020 165 M450 105C578 104 656 126 735 165S878 235 1020 242" fill="none" stroke="#00cfff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" filter="url(#dollar-wall-neon-glow)" />
      <path d="M-20 58C126 77 215 191 350 171S522 48 651 40 819 91 1020 70 M-20 120C88 211 207 191 321 141S497 174 611 105 759 209 871 180 953 139 1020 160 M-20 230C148 235 221 190 336 150S479 199 556 224 709 235 821 185 931 145 1020 165 M450 105C578 104 656 126 735 165S878 235 1020 242" fill="none" stroke="#e5fdff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M-20 105C128 115 207 65 334 96S491 160 602 128 783 98 1020 103 M-20 218C82 154 169 226 277 204S420 146 529 168 645 235 761 220 890 129 1020 134" fill="none" stroke="#19dcff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#dollar-wall-neon-glow)" />
      <path d="M-20 105C128 115 207 65 334 96S491 160 602 128 783 98 1020 103 M-20 218C82 154 169 226 277 204S420 146 529 168 645 235 761 220 890 129 1020 134" fill="none" stroke="#dffcff" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 hidden w-[4vw] bg-gradient-to-r from-[#031b44] via-[#031b44]/85 to-transparent lg:block" />
    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-[4vw] bg-gradient-to-l from-[#031b44] via-[#031b44]/85 to-transparent lg:block" />
    <span aria-hidden="true" className="pointer-events-none absolute -left-16 top-1/3 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
    <span aria-hidden="true" className="pointer-events-none absolute -right-14 bottom-4 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl" />
    <div className="relative z-10 grid items-start gap-6 lg:mx-auto lg:max-w-[1600px] lg:grid-cols-[220px_1fr]">
      <div>
        <h2 id="dollar-wall-title" className="text-[25px] font-extrabold leading-[1.04] tracking-[-.035em] text-white drop-shadow-[0_0_18px_rgba(0,185,255,.24)]"><span className="lg:hidden">A dollar</span><span className="hidden lg:inline">$1</span> can land<br/><span className="bg-gradient-to-r from-[#9cff58] via-[#74e72d] to-cyan-300 bg-clip-text text-transparent">almost anywhere.</span></h2>
        <p className="mt-3 max-w-none text-[15px] font-medium leading-snug tracking-[-.01em] text-white/80 lg:hidden">Hover to reveal. Click to add it forever.</p>
        <div className="mt-4 hidden md:block">{bundleControls()}</div>
      </div>
      <div>
        <p className="mb-2 hidden text-[14px] font-semibold tracking-[-.01em] text-white/90 drop-shadow-sm lg:block">Hover to reveal. Click to add it to your bundle.</p>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-2 md:grid-cols-8" aria-label="Interactive one dollar product wall">
          {items.map((item, index) => {
          const chosen = picks.some((pickItem) => pickItem.id === item.id);
          const isRevealed = revealed === item.id;
          return <button key={item.id} type="button" onMouseEnter={() => !chosen && setRevealed(item.id)} onMouseLeave={() => !chosen && setRevealed(null)} onClick={() => tap(item)} disabled={!chosen && picks.length >= 5} aria-label={`${item.name}${chosen ? ", selected; tap to remove" : ", tap once to reveal and again to add"}`} className={`dollar-tile-button group relative aspect-[1.15/1] min-h-[58px] touch-manipulation [perspective:700px] focus-visible:outline-2 focus-visible:outline-cyan-300 sm:min-h-[48px] ${index >= 12 ? "hidden sm:block" : ""} ${chosen ? "cursor-pointer rounded-lg shadow-[0_0_0_2px_#74e72d,0_0_20px_rgba(116,231,45,.65)]" : ""}`}>
            <span className={`absolute inset-0 [transform-style:preserve-3d] transition-transform duration-500 [transition-timing-function:cubic-bezier(.2,.75,.25,1)] ${chosen || isRevealed ? "[transform:rotateY(180deg)]" : ""}`}>
              <span
                className="dollar-mystery-tile absolute inset-0 overflow-hidden rounded-lg bg-[#03152f] bg-no-repeat shadow-[0_6px_18px_rgba(0,0,0,.42)] transition-[filter,transform] group-hover:brightness-110 [backface-visibility:hidden]"
                style={{ backgroundImage: "url('/solar-orbit-tiles.png')", backgroundSize: "340.6% 404.8%", backgroundPosition: solarOrbitPositions[index % solarOrbitPositions.length], animationDelay: `${index * 120}ms` }}
              />
              <span className={`absolute inset-0 overflow-hidden rounded-lg border bg-[#071627] [backface-visibility:hidden] [transform:rotateY(180deg)] ${chosen ? "border-[#74e72d]" : "border-cyan-300/40"}`}>
                <span className="absolute inset-0 bg-[length:600%_400%]" style={{ backgroundImage: `url(${sheetUrls[item.sheet ?? "main"]})`, backgroundPosition: photoPosition(item.photo) }} />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#00132e] via-[#00132e]/85 to-transparent px-1 pb-1 pt-3 text-center text-[8px] font-bold leading-tight text-white">{item.name}</span>
                {chosen && <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#74e72d] text-[9px] font-black text-[#00132e]">✓</span>}
              </span>
            </span>
          </button>;
          })}
        </div>
        {created && <div className="mt-3 hidden min-h-12 items-center gap-4 rounded-xl border border-white/25 bg-[#071426]/75 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.15)] backdrop-blur-sm md:flex"><strong className="shrink-0 text-[13px] font-extrabold text-[#9cf45c]">Bundle is ready</strong><span className="min-w-0 flex-1 truncate text-[11px] text-white/70">{picks.length} items × $1</span><strong className="shrink-0 text-[14px] text-white">${picks.length} total</strong><button type="button" className="shrink-0 rounded-lg bg-[#74e72d] px-5 py-2 text-[11px] font-extrabold text-[#00132e] hover:brightness-110">Enter ${picks.length}</button></div>}
      </div>
      <div className="flex flex-col md:hidden">{bundleControls(true)}</div>
    </div>
  </section>;
}
