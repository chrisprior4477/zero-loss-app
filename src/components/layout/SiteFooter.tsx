import Link from "next/link";
import { footerLinkGroups } from "@/lib/navigation";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-1">
          <p className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            ZeroLoss
          </p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--muted)]">
            A calmer way to shop with marketplace energy — built for trust,
            clarity, and confidence.
          </p>
        </div>

        {footerLinkGroups.map((group) => (
          <div key={group.title}>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {group.title}
            </p>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {year} ZeroLoss. All rights reserved.</p>
          <p>Shell scaffolding — product features arrive in later releases.</p>
        </div>
      </div>
    </footer>
  );
}
