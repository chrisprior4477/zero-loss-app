"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { claimReward, type RewardClaimActionState } from "@/lib/account/lifecycle-actions";
import { DemoVerificationDialog } from "@/components/identity/DemoVerificationDialog";
import { ClaimIdentityIntro } from "./ClaimIdentityIntro";
import { beginDemoVerification, skipDemoVerificationForPresentation } from "@/lib/identity/demo-verification-actions";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/account/notification-events";

const initialState: RewardClaimActionState = { status: "idle" };

export function RewardClaimControl({ rewardId, previewShown = false }: { rewardId: string; previewShown?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(claimReward, initialState);
  const [introOpen, setIntroOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const skipInFlight = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const claimButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (state.status === "succeeded") { window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT)); router.refresh(); } }, [router, state.status]);
  useEffect(() => {
    // The server, not the client, decides whether this claim needs verification.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.status === "verification_required") setIntroOpen(true);
  }, [state]);
  async function skipDemoAndClaim() {
    if (!previewShown || skipInFlight.current || pending) return;
    skipInFlight.current = true; setSkipping(true); setSkipError(null);
    try {
      const started = await beginDemoVerification(rewardId);
      if (!started.verification) { setSkipError(started.error); return; }
      const result = ["demo_passed", "demo_skipped"].includes(started.verification.step)
        ? started : await skipDemoVerificationForPresentation(rewardId, started.verification.id);
      if (!result.verification || !["demo_passed", "demo_skipped"].includes(result.verification.step)) {
        setSkipError(result.error ?? "We couldn’t confirm this demo step. Please try again."); return;
      }
      setIntroOpen(false);
      // Claim through the same owner-checked, idempotent server action as the full walkthrough.
      form.current?.requestSubmit();
    } catch { setSkipError("The connection was interrupted. Retry to check your saved demo progress."); }
    finally { skipInFlight.current = false; setSkipping(false); }
  }
  return <><form ref={form} action={action} className="mt-5 rounded-xl border border-[#00a31d]/25 bg-white/70 p-4 text-center">
    <input type="hidden" name="rewardId" value={rewardId} />
    <p className="text-sm font-bold text-[#173d5e]">{previewShown ? "Claim this reward to open its saved gift-card number. The sample above is for demonstration only." : "Claim this retailer gift card to reveal its barcode and number."}</p>
    <button ref={claimButton} type="submit" disabled={pending || state.status === "succeeded"} className="mt-4 min-h-12 w-full rounded-xl bg-[#31e800] px-4 text-base font-black text-[#062218] disabled:opacity-60">
      {pending ? "Claiming…" : state.status === "succeeded" ? "Reward claimed" : "Claim reward"}
    </button>
    {state.status !== "idle" ? <p role="status" className={`mt-3 text-xs font-bold ${state.status === "error" ? "text-[#a32900]" : "text-[#08721c]"}`}>{state.message}</p> : null}
  </form>{introOpen ? <ClaimIdentityIntro busy={skipping} error={skipError} onSkipDemo={previewShown ? skipDemoAndClaim : undefined} onClose={() => { setIntroOpen(false); claimButton.current?.focus(); }} onContinue={() => { setIntroOpen(false); setVerificationOpen(true); }} /> : null}
  {verificationOpen ? <DemoVerificationDialog rewardId={rewardId} onClose={() => { setVerificationOpen(false); claimButton.current?.focus(); }} onComplete={() => {
    setVerificationOpen(false);
    form.current?.requestSubmit();
  }} /> : null}</>;
}
