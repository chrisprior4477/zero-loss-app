import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { createClient } from "@/lib/supabase/server";
import {
  getLedgerEntriesForCustomer,
  getPlayableBalanceLabel,
} from "@/lib/wallet/balance";
import { formatUsdFromCents } from "@/lib/wallet/money";

export const metadata: Metadata = {
  title: "Wallet",
};

function formatLedgerDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let balanceLabel = "$0.00";
  let entries: Awaited<ReturnType<typeof getLedgerEntriesForCustomer>> = [];

  try {
    [balanceLabel, entries] = await Promise.all([
      getPlayableBalanceLabel(user.id),
      getLedgerEntriesForCustomer(user.id),
    ]);
  } catch {
    // Page still renders; balance stays at zero and list empty on read failure.
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Wallet
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Your playable balance and ledger history. Derived from the Ledger —
          not a separate stored total.
        </p>

        <dl className="mt-8 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="px-5 py-4 sm:px-6">
            <dt className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              Playable balance
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[var(--foreground)]">
              {balanceLabel}
            </dd>
          </div>
        </dl>

        <h2 className="mt-10 text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Ledger
        </h2>

        {entries.length === 0 ? (
          <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--muted)]">
            No ledger entries yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {entries.map((entry, index) => (
              <li
                key={`${entry.created_at}-${entry.entry_type}-${index}`}
                className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {entry.entry_type}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {formatLedgerDate(entry.created_at)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums text-[var(--foreground)]">
                  {formatUsdFromCents(entry.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-sm text-[var(--muted)]">
          <Link
            href="/account"
            className="text-[var(--foreground)] underline-offset-4 hover:underline"
          >
            Back to profile
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
