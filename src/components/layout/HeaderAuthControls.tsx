import Link from "next/link";
import { signOutAction } from "@/lib/auth/actions";

type HeaderAuthControlsProps = {
  firstName: string | null;
};

export function HeaderAuthControls({ firstName }: HeaderAuthControlsProps) {
  if (firstName) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-[10rem] truncate text-sm text-[var(--muted)] sm:inline">
          Signed in as{" "}
          <span className="font-medium text-[var(--foreground)]">
            {firstName}
          </span>
        </span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)]"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)]"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="hidden rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] sm:inline-flex"
      >
        Sign up
      </Link>
    </div>
  );
}
