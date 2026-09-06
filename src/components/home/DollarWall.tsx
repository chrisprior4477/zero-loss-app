"use client";

import { useState } from "react";

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

const tileAccents = ["#18bfff", "#8b5cf6", "#74e72d", "#ff6b22", "#ec4899", "#22d3ee"];

export function DollarWall() {
  const [items, setItems] = useState(starters);
  const [picks, setPicks] = useState<Item[]>([]);
  const [help, setHelp] = useState(false);
  const [created, setCreated] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);

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

  return <section aria-labelledby="dollar-wall-title" className="relative overflow-hidden rounded-[22px] border border-cyan-300/30 bg-[radial-gradient(circle_at_15%_12%,rgba(0,185,255,.2),transparent_30%),radial-gradient(circle_at_88%_82%,rgba(139,92,246,.2),transparent_34%),linear-gradient(135deg,#041d42,#020d20_58%,#071936)] px-5 py-6 shadow-[0_18px_44px_rgba(0,0,0,.3),inset_0_1px_0_rgba(125,230,255,.1)] sm:px-7">
    <span aria-hidden="true" className="pointer-events-none absolute -left-16 top-1/3 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
    <span aria-hidden="true" className="pointer-events-none absolute -right-14 bottom-4 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl" />
    <div className="relative z-10 grid items-start gap-6 lg:grid-cols-[220px_1fr]">
      <div>
        <h2 id="dollar-wall-title" className="text-[25px] font-extrabold leading-[1.04] tracking-[-.035em] text-white drop-shadow-[0_0_18px_rgba(0,185,255,.24)]">A dollar can land<br/><span className="bg-gradient-to-r from-[#9cff58] via-[#74e72d] to-cyan-300 bg-clip-text text-transparent">almost anywhere.</span></h2>
        <p className="mt-3 text-[12px] leading-relaxed text-white/60">Hover to reveal.<br/>Click to add it forever.</p>
        <div className="mt-4 min-h-[100px] rounded-xl border border-cyan-300/20 bg-[#00132e]/65 p-3 shadow-[inset_0_0_22px_rgba(0,185,255,.06)]">
          <div className="flex justify-between"><h3 className="text-[11px] font-extrabold uppercase tracking-[.1em] text-cyan-300">Your bundle</h3><span className="text-[10px] text-white/45">{picks.length}/5</span></div>
          {picks.length ? <ul className="mt-2 space-y-1.5">{picks.map((item) => <li key={item.id} className="flex items-center justify-between gap-2 text-[10px] text-white/75"><span className="min-w-0 truncate"><span className="mr-1.5 text-[#74e72d]">✓</span>{item.name}</span><button type="button" onClick={() => remove(item)} aria-label={`Remove ${item.name}`} className="shrink-0 rounded-md border border-red-300/30 px-2 py-1 font-bold text-red-200 hover:bg-red-400/15">Remove</button></li>)}</ul> : <p className="mt-3 text-[10px] leading-relaxed text-white/40">Your picks will appear here.</p>}
        </div>
        <button type="button" disabled={picks.length < 2} onClick={() => setCreated(true)} className="mt-3 w-full rounded-lg bg-[#74e72d] px-3 py-2.5 text-[11px] font-extrabold text-[#00132e] enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35">Create bundle</button>
        <div className="mt-3 flex gap-2"><button type="button" onClick={() => setHelp(!help)} className="flex-1 rounded-md border border-cyan-300/25 px-2 py-2 text-[10px] font-bold text-cyan-300 hover:bg-cyan-300/10">How it works</button>{picks.length > 0 && <button type="button" onClick={reset} className="flex-1 rounded-md border border-white/20 px-2 py-2 text-[10px] font-bold text-white/70 hover:bg-white/10">Clear all</button>}</div>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-2 md:grid-cols-8" aria-label="Interactive one dollar product wall">
        {items.map((item, index) => {
          const chosen = picks.some((pickItem) => pickItem.id === item.id);
          const isRevealed = revealed === item.id;
          const accent = tileAccents[index % tileAccents.length];
          return <button key={item.id} type="button" onMouseEnter={() => !chosen && setRevealed(item.id)} onMouseLeave={() => !chosen && setRevealed(null)} onClick={() => tap(item)} disabled={!chosen && picks.length >= 5} aria-label={`${item.name}${chosen ? ", selected; tap to remove" : ", tap once to reveal and again to add"}`} className={`dollar-tile-button group relative aspect-[1.15/1] min-h-[58px] touch-manipulation [perspective:700px] focus-visible:outline-2 focus-visible:outline-cyan-300 sm:min-h-[48px] ${index >= 18 ? "hidden sm:block" : ""} ${chosen ? "cursor-pointer rounded-lg shadow-[0_0_0_2px_#74e72d,0_0_20px_rgba(116,231,45,.65)]" : ""}`}>
            <span className={`absolute inset-0 [transform-style:preserve-3d] transition-transform duration-500 [transition-timing-function:cubic-bezier(.2,.75,.25,1)] ${chosen || isRevealed ? "[transform:rotateY(180deg)]" : ""}`}>
              <span
                className="dollar-mystery-tile absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-lg border text-white shadow-[0_6px_16px_rgba(0,0,0,.3),inset_0_0_18px_rgba(255,255,255,.035)] transition-[filter,box-shadow] group-hover:brightness-125 group-hover:shadow-[0_0_22px_rgba(24,191,255,.28)] [backface-visibility:hidden]"
                style={{ borderColor: `${accent}88`, background: `radial-gradient(circle at 50% 46%,${accent}42,transparent 42%),linear-gradient(145deg,${accent}30,#0a1524 64%)`, animationDelay: `${index * 120}ms` }}
              >
                <span aria-hidden="true" className="absolute inset-[2px] rounded-[6px] bg-[radial-gradient(circle_at_50%_48%,rgba(12,42,82,.5),#020b19_76%)]" />
                <span aria-hidden="true" className="dollar-solar-orbit absolute left-1/2 top-1/2 z-[2] h-[62%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border" style={{ borderColor: accent, boxShadow: `0 0 8px ${accent},inset 0 0 5px ${accent}` }}>
                  <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white" style={{ boxShadow: `0 0 5px 2px white,0 0 12px 5px ${accent}` }} />
                  <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white" style={{ boxShadow: `0 0 5px 2px white,0 0 12px 5px ${accent}` }} />
                </span>
                <span aria-hidden="true" className="dollar-solar-orbit dollar-solar-orbit-reverse absolute left-1/2 top-1/2 z-[2] h-[78%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border opacity-90" style={{ borderColor: `${accent}cc`, boxShadow: `0 0 7px ${accent}` }} />
                <span aria-hidden="true" className="dollar-solar-orbit dollar-solar-orbit-slow absolute left-1/2 top-1/2 z-[2] h-[48%] w-[94%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border opacity-75" style={{ borderColor: `${accent}aa` }} />
                <span className="dollar-coin-core relative z-10 grid h-14 w-14 place-items-center rounded-full border bg-[radial-gradient(circle_at_45%_38%,#173968,#06152d_65%,#020814)] text-[21px] font-black leading-none text-white sm:h-11 sm:w-11 sm:text-[17px]" style={{ borderColor: `${accent}aa`, boxShadow: `0 0 18px 5px ${accent}88,inset 0 0 16px ${accent}44` }}>
                  $1
                  <span className="absolute inset-1 rounded-full border border-white/10" />
                </span>
              </span>
              <span className={`absolute inset-0 overflow-hidden rounded-lg border bg-[#071627] [backface-visibility:hidden] [transform:rotateY(180deg)] ${chosen ? "border-[#74e72d]" : "border-cyan-300/40"}`}>
                <span className="absolute inset-0 bg-[length:600%_400%]" style={{ backgroundImage: `url(${sheetUrls[item.sheet ?? "main"]})`, backgroundPosition: photoPosition(item.photo) }} />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#00132e] via-[#00132e]/85 to-transparent px-1 pb-1 pt-3 text-center text-[8px] font-bold leading-tight text-white">{item.name}</span>
                {chosen && <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#74e72d] text-[9px] font-black text-[#00132e]">✓</span>}
              </span>
            </span>
          </button>;
        })}
      </div>
    </div>
    {help && <div className="mt-5 border-t border-white/10 pt-4 text-center text-[12px] text-white/65">Start with any surprise. That choice fills the wall with matching extras. Pick two to five items. Tap a green card again—or use its Remove button—to change your mind.</div>}
    {created && <div className="mt-5 rounded-xl border border-[#74e72d]/35 bg-[#74e72d]/10 px-5 py-5 text-center"><strong className="text-sm text-[#9cf45c]">Your bundle is ready.</strong><p className="mt-1 text-[11px] text-white/65">{picks.map((item) => item.name).join(" + ")}</p><div className="mx-auto mt-4 flex max-w-md items-center justify-between rounded-lg bg-[#00132e]/70 px-4 py-3"><span className="text-xs text-white/65">{picks.length} items × $1</span><strong className="text-lg text-white">${picks.length} total</strong></div><button type="button" className="mt-3 rounded-lg bg-[#74e72d] px-6 py-2.5 text-xs font-extrabold text-[#00132e]">Enter ${picks.length}</button></div>}
  </section>;
}
