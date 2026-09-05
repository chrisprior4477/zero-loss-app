const benefits = [
  { icon: "eye", title: "Early look", copy: "See upcoming rewards first", color: "#22d3ee" },
  { icon: "star", title: "Your wish is our command", copy: "Suggest what we add next", color: "#b965ff" },
  { icon: "bag", title: "Member drops", copy: "Explore members-only collections", color: "#94e322" },
  { icon: "gift", title: "Partner extras", copy: "New offers throughout the month", color: "#b965ff" },
  { icon: "orbit", title: "Smart automation", copy: "Follow your favorite categories", color: "#22d3ee" },
];

function BenefitIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      {name === "eye" && <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}
      {name === "star" && <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />}
      {name === "bag" && <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M8 9V6a4 4 0 0 1 8 0v3" /></>}
      {name === "gift" && <><path d="M3 8h18v5H3zM5 13v8h14v-8M12 8v13" /><path d="M12 8C2 8 5 0 9 3l3 5Zm0 0c10 0 7-8 3-5l-3 5Z" /></>}
      {name === "orbit" && <><circle cx="12" cy="12" r="4" /><path d="M5 5a10 10 0 0 1 14 0M19 19a10 10 0 0 1-14 0M3 9v6M21 9v6" /><circle cx="5" cy="5" r="1" /><circle cx="19" cy="19" r="1" /></>}
    </svg>
  );
}

export function PremiumMembershipPanel() {
  return (
    <section aria-labelledby="premium-heading" className="min-w-0 rounded-[24px] border border-cyan-300/30 bg-[radial-gradient(ellipse_at_20%_65%,#112454_0%,#020d1c_60%)] p-5 shadow-[0_16px_38px_rgba(0,0,0,0.2)]">
      <header className="mb-4 flex items-center gap-3">
        <svg viewBox="0 0 32 36" fill="none" stroke="currentColor" strokeWidth="2" className="h-9 w-8 shrink-0 text-cyan-300" aria-hidden="true"><path d="M16 2 29 7v10c0 8-8 14-13 17C11 31 3 25 3 17V7L16 2Z" /><path d="m9 17 5 5 9-11" /></svg>
        <div><h3 id="premium-heading" className="text-[18px] font-extrabold tracking-tight text-white">Premium membership</h3><p className="text-xs text-white/55">Explore member benefits.</p></div>
      </header>
      <div className="grid grid-cols-[0.85fr_1.15fr] items-center gap-4">
        <div className="relative mx-auto flex min-h-[220px] w-full max-w-[170px] -rotate-3 flex-col items-center justify-between rounded-[18px] border border-cyan-300/70 bg-[repeating-linear-gradient(135deg,transparent_0px,transparent_8px,#0b2440_9px,transparent_10px)] px-3 py-4 shadow-[0_0_8px_#00baff66,5px_8px_24px_#006aff33,inset_0_0_15px_#03172f]" aria-label="Zero Loss premium member pass concept">
          <div className="text-center"><div className="text-xl font-black tracking-tight text-white">ZERØ<span className="text-lime-400">LØSS</span></div><div className="mt-1 text-[7px] font-semibold tracking-[0.24em] text-cyan-300">PREMIUM MEMBER</div></div>
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-cyan-300 text-[65px] leading-none text-white shadow-[0_0_8px_#00d9ff,0_0_20px_#a238ff,inset_0_0_12px_#475aff] [text-shadow:0_0_6px_#00d9ff,0_0_12px_#a238ff]">Ø</div>
          <div className="text-[9px] tracking-[0.28em] text-cyan-300">MEMBER PASS</div>
          <div className="h-5 w-full opacity-70 bg-[repeating-linear-gradient(90deg,#22d3ee_0px,#22d3ee_1px,transparent_1px,transparent_3px,#0284c7_3px,#0284c7_5px,transparent_5px,transparent_7px)]" />
        </div>
        <ul className="relative space-y-3 before:absolute before:inset-y-3 before:left-[14px] before:w-px before:bg-gradient-to-b before:from-cyan-400/50 before:via-purple-500/50 before:to-cyan-400/50">
          {benefits.map((benefit) => <li key={benefit.title} className="relative flex items-center gap-2.5"><span className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-full border bg-[#031020]" style={{ color: benefit.color, borderColor: `${benefit.color}66`, boxShadow: `0 0 10px ${benefit.color}22` }}><BenefitIcon name={benefit.icon} /></span><div><h4 className="text-[11px] font-bold leading-tight text-white">{benefit.title}</h4><p className="mt-0.5 text-[10px] leading-snug text-white/55">{benefit.copy}</p></div></li>)}
        </ul>
      </div>
      <details className="group mt-4 text-center">
        <summary className="cursor-pointer list-none rounded-xl border border-purple-400/40 bg-gradient-to-r from-violet-700 to-[#211052] px-4 py-2 text-xs font-bold text-white transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">Explore premium <span aria-hidden="true" className="ml-2">→</span></summary>
        <p className="mt-3 text-xs leading-relaxed text-white/60">Premium membership preview. These proposed benefits are not yet available; no subscription or payment is taken.</p>
      </details>
    </section>
  );
}
