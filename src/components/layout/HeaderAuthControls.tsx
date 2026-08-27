import Link from "next/link";
import { signOutAction } from "@/lib/auth/actions";

type HeaderAuthControlsProps = {
  firstName: string | null;
};

/* Styling only. Sign-in is the design's solid cyan chip with deep-blue text;
   secondary actions are quiet outlines so the primary action stays dominant. */
const secondaryClass =
  "rounded-full border border-[var(--border-strong)] px-3.5 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]";

export function HeaderAuthControls({ firstName }: HeaderAuthControlsProps) {
  if (firstName) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/account" className={secondaryClass}>
          Account
        </Link>
        <form action={signOutAction}>
          <button type="submit" className={secondaryClass}>
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className={secondaryClass}>
        Sign in
      </Link>
      <Link
        href="/signup"
        className="inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--ink)] transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
      >
        Sign up
      </Link>
    </div>
  );
}
