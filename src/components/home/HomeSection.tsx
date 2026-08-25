import type { ReactNode } from "react";

/**
 * Shared section shell for the homepage: heading, optional supporting line,
 * optional trailing link. Keeps the vertical rhythm of spec §4 consistent
 * without each section re-inventing its header.
 */

type HomeSectionProps = {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function HomeSection({
  id,
  title,
  description,
  action,
  children,
  className = "",
}: HomeSectionProps) {
  return (
    <section aria-labelledby={`${id}-heading`} className={className}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id={`${id}-heading`}
            className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}
