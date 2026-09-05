"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { socialActivityDemoItems } from "@/lib/home/demo-data";

type Platform = "x" | "facebook" | "instagram" | "tiktok";

const platforms: Array<{ id: Platform; label: string; mark: string; color: string }> = [
  { id: "x", label: "X", mark: "X", color: "#eef2f7" },
  { id: "facebook", label: "Facebook", mark: "f", color: "#1877f2" },
  { id: "instagram", label: "Instagram", mark: "◎", color: "#d946ef" },
  { id: "tiktok", label: "TikTok", mark: "♪", color: "#111827" },
];

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "x") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M4 3h4.7l4.2 5.7L18 3h2l-6.2 7.1L21 21h-4.7l-4.7-6.3L6 21H4l6.7-7.7L4 3Zm3.7 1.6L17.1 19h2.1L9.8 4.6H7.7Z" /></svg>;
  }
  if (platform === "facebook") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M14 8h3V4.3c-.5-.1-2.2-.3-4-.3-3 0-5 1.8-5 5.2V12H5v4h3v8h4v-8h3.3l.7-4h-4V9.6c0-1.2.3-1.6 2-1.6Z" /></svg>;
  }
  if (platform === "instagram") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" className="fill-current stroke-none" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#25f4ee" d="M14 3v11.2a3.2 3.2 0 1 1-2.3-3.1V8.4a5.8 5.8 0 1 0 5.1 5.8V8.1c1.2.9 2.7 1.4 4.2 1.4V6.7A4.3 4.3 0 0 1 16.8 3H14Z" /><path fill="#fe2c55" opacity=".8" d="M16 3v10.7a3.2 3.2 0 1 1-2.3-3.1v2.7a1 1 0 1 0 .3.7V3h2Z" /></svg>;
}

export function SocialActivityFeed() {
  const [platform, setPlatform] = useState<Platform>("x");
  const [paused, setPaused] = useState(false);

  const items = useMemo(
    () => socialActivityDemoItems.filter((item) => item.platform === platform),
    [platform],
  );
  const stripItems = useMemo(
    () => Array.from({ length: 8 }, (_, repetition) =>
      items.map((item) => ({ item, repetition })),
    ).flat(),
    [items],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlatform((current) => {
        const index = platforms.findIndex((item) => item.id === current);
        return platforms[(index + 1) % platforms.length].id;
      });
    }, 20000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section aria-labelledby="social-activity-title" className="min-w-0 overflow-hidden rounded-[22px] border border-cyan-300/20 bg-[#071426] shadow-[0_16px_40px_rgba(0,0,0,.22)]">
      <header className="flex h-[49px] items-center justify-between border-b border-white/8 px-4">
        <div className="flex items-center gap-2.5">
          <h2 id="social-activity-title" className="text-[15px] font-extrabold text-white">Social Activity Live Feed</h2>
          <span className="rounded-full border border-cyan-300/35 px-2 py-0.5 text-[8px] font-black uppercase tracking-[.14em] text-cyan-300">Live stream</span>
        </div>
        <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Play social activity" : "Pause social activity"} className="grid h-8 w-8 place-items-center rounded-full bg-[#24334a] text-[11px] font-black text-white transition hover:bg-[#30435f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
          {paused ? "▶" : "Ⅱ"}
        </button>
      </header>

      <div className="group flex h-[152px] gap-3 p-3">
        <nav aria-label="Filter social activity" className="flex w-[48px] shrink-0 flex-col items-center justify-center gap-1 rounded-[16px] border border-white/10 bg-[#06101f] py-1">
          {platforms.map((item) => (
            <button key={item.id} type="button" onClick={() => setPlatform(item.id)} aria-label={item.label} aria-pressed={platform === item.id} className="grid h-9 w-9 place-items-center rounded-full border text-[12px] font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" style={{ color: item.id === "x" ? "#071426" : "white", background: item.color, borderColor: platform === item.id ? "white" : "rgba(255,255,255,.12)", boxShadow: platform === item.id ? `0 0 0 2px #071426, 0 0 0 4px ${item.color}` : "none" }}>
              <PlatformIcon platform={item.id} />
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 overflow-hidden" aria-label={`${platform} posts`}>
          <div className="social-feed-track flex h-full w-max" style={{ animationPlayState: paused ? "paused" : undefined, animationDuration: `${stripItems.length * 3.5}s` }}>
            {[0, 1].map((copy) => (
              <div key={copy} aria-hidden={copy === 1} className="flex h-full gap-3 pr-3">
                {stripItems.map(({ item, repetition }) => {
                  const decorativeCopy = copy === 1 || repetition > 0;
                  return (
                  <Link href="/browse?view=winners" aria-hidden={decorativeCopy || undefined} tabIndex={decorativeCopy ? -1 : undefined} key={`${copy}-${repetition}-${item.id}`} className="flex h-full w-[225px] min-w-0 flex-col rounded-[15px] border border-white/10 bg-white/[.055] p-3 transition hover:border-cyan-300/50 hover:bg-white/[.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/25" style={{ backgroundColor: item.accent }}>
                        <Image src={item.avatar} alt={`${item.name} profile`} fill sizes="40px" className="object-cover object-top" />
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-[13px] text-white">{item.name}</strong>
                        <span className="block truncate text-[10px] text-white/50">{item.handle}</span>
                      </span>
                    </span>
                    <span className="mt-auto line-clamp-2 block pt-2 text-[11px] font-medium leading-[1.35] text-white/90">{item.message}</span>
                  </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
