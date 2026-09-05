"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { recentWinnerDemoItems } from "@/lib/home/demo-data";

export function RecentWinnerRoll() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % recentWinnerDemoItems.length);
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  const winner = recentWinnerDemoItems[activeIndex];

  return (
    <section aria-labelledby="recent-winners-title" className="overflow-hidden rounded-[22px] border border-cyan-300/20 bg-[linear-gradient(135deg,#00142f,#042654)] shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative grid h-7 w-7 place-items-center rounded-full bg-[#72e82e]/15 text-[14px] text-[#7df33c]">
            <span aria-hidden="true">★</span>
            <span className="absolute inset-0 animate-ping rounded-full border border-[#72e82e]/30" />
          </span>
          <h2 id="recent-winners-title" className="text-[15px] font-extrabold text-white">Someone just won</h2>
        </div>
        <span className="rounded-full border border-cyan-300/30 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-300">Demo activity</span>
      </div>

      <Link key={`${winner.name}-${activeIndex}`} href={winner.href} className="winner-cylinder-entry group relative flex min-h-[118px] items-center gap-3 overflow-hidden px-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
        <span aria-hidden="true" className="absolute -right-8 -top-16 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
        <span style={{ width: 68, height: 68, minWidth: 68, minHeight: 68 }} className="relative block shrink-0 overflow-hidden rounded-full border-2 border-cyan-300/55 bg-white shadow-[0_0_22px_rgba(0,185,255,.25)]">
          <Image src={winner.avatar} alt="" aria-hidden="true" fill sizes="68px" className="object-cover object-top" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#7def3b]">Winner confirmed</span>
          <span className="mt-1 block text-[17px] font-black leading-tight tracking-[-0.02em] text-white">
            {winner.name} <span className="font-semibold text-white/70">has won</span>
          </span>
          <span className="mt-1 block text-[12px] font-bold leading-tight text-cyan-200">{winner.reward}</span>
        </span>
      </Link>
    </section>
  );
}
