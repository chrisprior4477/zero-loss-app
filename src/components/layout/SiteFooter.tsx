import Link from "next/link";
import { footerLinkGroups } from "@/lib/navigation";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-cyan-300/10 bg-[#000f25]">
      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:px-6 md:grid-cols-[1.5fr_repeat(4,1fr)] md:gap-8 md:py-8 lg:px-[clamp(3rem,6vw,7rem)]">
        <div>
          <p className="text-[22px] font-extrabold uppercase tracking-[-0.04em] text-white">
            ZERØ<span className="text-[#73e72d]">LØSS</span>
          </p>
          <p className="mt-2 max-w-[250px] text-[12px] leading-relaxed text-white/60">
            A fair way to play for real rewards.<br />
            Real shots. Real wins. Zero loss.
          </p>
          <div className="mt-4 flex gap-2" aria-label="Social media links coming soon">
            {[
              ["f", "Facebook"],
              ["𝕏", "X"],
              ["◎", "Instagram"],
              ["▶", "YouTube"],
            ].map(([symbol, label]) => (
              <span key={label} title={`${label} coming soon`} aria-label={`${label} coming soon`} className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/10 text-[11px] font-bold text-white/80">
                {symbol}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-4 gap-y-6 md:contents">
          {footerLinkGroups.map((group) => (
            <div key={group.title} className="min-w-0">
              <p className="text-[11px] font-extrabold text-white sm:text-[12px]">
                {group.title}
              </p>
              <ul className="mt-2 space-y-1.5">
                {group.links.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <Link
                      href={link.href}
                      className="text-[10px] leading-tight text-white/58 transition-colors hover:text-cyan-300 sm:text-[11px]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-3 text-[10px] text-white/38 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-[clamp(3rem,6vw,7rem)]">
          <p>© {year} ZeroLoss. All rights reserved.</p>
          <p>Shopping should never feel like losing.</p>
        </div>
      </div>
    </footer>
  );
}
