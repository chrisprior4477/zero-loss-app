"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function AccountReadRetryButton({ label, className }: { label: string; className?: string }) {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();

  return <button type="button" className={className} aria-disabled={retrying || undefined} onClick={() => {
    if (!retrying) startTransition(() => router.refresh());
  }}>
    {retrying ? "Trying again…" : label}
  </button>;
}
