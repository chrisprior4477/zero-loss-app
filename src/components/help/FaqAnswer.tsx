import Link from "next/link";
import type { FaqItem } from "@/lib/help/faq";

export function FaqAnswer({ item, expanded }: { item: FaqItem; expanded?: boolean }) {
  return <details open={expanded} className="group rounded-2xl border border-cyan-300/25 bg-[#052344] open:border-cyan-300/60">
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-bold text-white marker:hidden focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">
      {item.question}<span aria-hidden="true" className="shrink-0 text-xl text-cyan-300 transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
    </summary>
    <div className="px-5 pb-5"><p className="text-sm leading-7 text-[#c3d8ed] sm:text-base">{item.answer}</p><Link href={item.action.href} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg font-extrabold text-cyan-300 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">{item.action.label}<span aria-hidden="true">→</span></Link></div>
  </details>;
}
