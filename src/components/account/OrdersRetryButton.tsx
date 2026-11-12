"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function OrdersRetryButton({ label }: { label: string }) {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();

  return <button type="button" disabled={retrying} onClick={() => startTransition(() => router.refresh())}>
    {retrying ? "Trying again…" : label}
  </button>;
}
