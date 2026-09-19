"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { breadcrumbItems } from "@/lib/navigation/breadcrumbs";
import { HomeIcon } from "./HomeIcon";

/** One compact escape route, shared by every non-home page. */
export function SiteBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = breadcrumbItems(pathname, searchParams);
  if (!items.length) return null;

  return <nav aria-label="Breadcrumb" className="border-b border-cyan-300/15 bg-[#061d35] px-4 py-1.5 text-[12px] leading-5 text-cyan-100 sm:px-6 sm:text-[13px] lg:px-10 print:hidden">
    <ol className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <li><Link href="/" className="inline-flex min-h-7 items-center gap-1 font-bold text-cyan-200 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300"><HomeIcon className="h-[17px] w-[17px]" />Home</Link></li>
      {items.map((item, index) => <li key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-1.5">
        <span aria-hidden="true" className="text-cyan-300/55">›</span>
        {item.href ? <Link href={item.href} className="font-semibold text-cyan-200 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300">{item.label}</Link> : <span aria-current="page" className="font-semibold text-white">{item.label}</span>}
      </li>)}
    </ol>
  </nav>;
}
