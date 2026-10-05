import type { ReactNode } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";

const legalLinks = [
  { href: "/legal", label: "Overview" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/responsible-participation", label: "Responsible Play" },
] as const;

export const legalCopy = {
  paragraph: "text-sm leading-7 text-white/75 sm:text-base",
  list: "mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-white/75 sm:text-base",
  link: "font-bold text-cyan-300 underline decoration-cyan-300/40 underline-offset-4 hover:text-white",
};

export function LegalPage({ title, description, current, children }: {
  title: string;
  description: string;
  current: string;
  children: ReactNode;
}) {
  return (
    <PageContainer className="pb-16 text-white">
      <header className="max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Legal and safety</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/75 sm:text-lg">{description}</p>
      </header>
      <nav aria-label="Legal pages" className="mt-8 flex flex-wrap gap-2 border-b border-white/15 pb-5">
        {legalLinks.map((link) => (
          <Link key={link.href} href={link.href} aria-current={current === link.href ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${current === link.href ? "border-[#31e800] bg-[#31e800] text-[#00132e]" : "border-cyan-300/25 bg-[#082e52] text-cyan-100 hover:border-cyan-300"}`}>
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </PageContainer>
  );
}

export function ReviewNotice() {
  return (
    <aside className="mt-8 max-w-4xl rounded-2xl border border-amber-300/35 bg-amber-300/10 p-5 sm:p-6" aria-label="Preview status">
      <p className="text-xs font-black uppercase tracking-[.15em] text-amber-200">Preview draft — review required</p>
      <p className="mt-2 text-sm leading-7 text-white/85">These pages describe the current demo and proposed policies. The supplied Official Rules are a working draft, not approved for publication or a live promotion. Legal review, payment-processor approval, an operational no-purchase entry method, final eligibility, and operator details are still required before real entries or payments.</p>
    </aside>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-28 border-b border-white/10 py-6 last:border-0 sm:py-8">
      <h2 id={`${id}-heading`} className="text-xl font-black tracking-tight text-white sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}
