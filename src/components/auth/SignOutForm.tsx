"use client";

import { useActionState, useRef, type ReactNode } from "react";
import { signOutAction } from "@/lib/auth/actions";
import { currentProductEntryHref, readEntryIntent } from "@/lib/entries/return-intent";

export function SignOutForm({ children, className }: { children: ReactNode; className?: string }) {
  const returnField = useRef<HTMLInputElement>(null);

  const [feedback, action, pending] = useActionState(
    async (_previous: { message: string } | null, data: FormData) => signOutAction(data), null,
  );

  return <form action={action} aria-busy={pending} aria-describedby={feedback ? "sign-out-error" : undefined} className={className} onSubmit={() => {
    if (!returnField.current) return;
    returnField.current.value = currentProductEntryHref(window.location.pathname, window.location.search, readEntryIntent()) ?? "";
  }}>
    <input ref={returnField} type="hidden" name="returnTo" />
    {children}
    {feedback && <p id="sign-out-error" role="alert">{feedback.message}</p>}
  </form>;
}
