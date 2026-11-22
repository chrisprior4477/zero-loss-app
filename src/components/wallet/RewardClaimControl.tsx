"use client";

import { AccountReadRetryLink } from "@/components/account/AccountReadRetryLink";
import { useDeadline } from "@/components/account/useDeadline";
import { useActionState, useEffect, useRef, useState } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { claimReward, type RewardClaimActionState } from "@/lib/account/lifecycle-actions";
import { useDialogBack } from "@/components/account/useDialogBack";
import { DemoVerificationDialog } from "@/components/identity/DemoVerificationDialog";
import { ClaimIdentityIntro } from "./ClaimIdentityIntro";
import { beginDemoVerification, skipDemoVerificationForPresentation } from "@/lib/identity/demo-verification-actions";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/account/notification-events";

const initialState: RewardClaimActionState = { status: "idle" };

export function RewardClaimControl({ rewardId, previewShown = false, checkHref, expiresAt }: { rewardId: string; previewShown?: boolean; checkHref?: string; expiresAt?: string | null }) {
  const router = useRouter();
  const deadline = Date.parse(expiresAt ?? "");
  const expired = useDeadline(deadline);
  const [state, action, pending] = useActionState(async (previous: RewardClaimActionState, data: FormData): Promise<RewardClaimActionState> => {
    try { return await claimReward(previous, data); }
    catch (error) {
      unstable_rethrow(error);
      return { status: "error", recovery: "check", message: "We couldn’t confirm whether your reward was claimed. Check its saved status before trying again." };
    }
  }, initialState);
  const needsCheck = state.status === "error" && state.recovery === "check";
  const [introOpen, setIntroOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const skipInFlight = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const claimButton = useRef<HTMLButtonElement>(null);
  const claimStatus = useRef<HTMLParagraphElement>(null);
  const dismissedVerification = useRef(false);
  function closeClaimReview() {
    setIntroOpen(false);
    setVerificationOpen(false);
    claimButton.current?.focus({ preventScroll: true });
  }
  const introScope = "reward-claim-intro-" + rewardId;
  const verificationScope = "reward-claim-check-" + rewardId;
  const canResume = !introOpen && !verificationOpen && !pending && state.status === "verification_required";
  useDialogBack(false, closeClaimReview, false, false, false, introScope, () => {
    if (canResume && !dismissedVerification.current) setIntroOpen(true);
  });
  useDialogBack(false, closeClaimReview, false, false, false, verificationScope, () => {
    if (canResume && !dismissedVerification.current) setVerificationOpen(true);
  });
  useEffect(() => {
    if (state.status !== "succeeded") return;
    if (document.activeElement === document.body || document.activeElement === claimButton.current) {
      (document.getElementById("reward-pass-title") ?? claimStatus.current)?.focus({ preventScroll: true });
    }
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    router.refresh();
  }, [router, state.status]);
  useEffect(() => {
    // The server, not the client, decides whether this claim needs verification.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.status === "verification_required") { dismissedVerification.current = false; setIntroOpen(true); }
  }, [state]);
  async function skipDemoAndClaim() {
    if (!previewShown || skipInFlight.current || pending) return;
    if (Date.now() >= deadline) { setSkipError("The claim deadline passed. This reward can no longer be claimed."); return; }
    skipInFlight.current = true; setSkipping(true); setSkipError(null);
    try {
      const started = await beginDemoVerification(rewardId);
      if (!form.current) return;
      if (!started.verification) { setSkipError(started.error); return; }
      const result = ["demo_passed", "demo_skipped"].includes(started.verification.step)
        ? started : await skipDemoVerificationForPresentation(rewardId, started.verification.id);
      if (!form.current) return;
      if (!result.verification || !["demo_passed", "demo_skipped"].includes(result.verification.step)) {
        setSkipError(result.error ?? "We couldn’t confirm this demo step. Please try again."); return;
      }
      if (Date.now() >= deadline) { setSkipError("The claim deadline passed before your reward could be claimed."); return; }
      setIntroOpen(false);
      // Claim through the same owner-checked, idempotent server action as the full walkthrough.
      form.current.requestSubmit();
    } catch { setSkipError("The connection was interrupted. Retry to check your saved demo progress."); }
    finally { skipInFlight.current = false; setSkipping(false); }
  }
  return <><form ref={form} action={action} onSubmit={event => { if (Date.now() >= deadline) event.preventDefault(); }} className="mt-5 rounded-xl border border-[#00a31d]/25 bg-white/70 p-4 text-center">
    <input type="hidden" name="rewardId" value={rewardId} />
    <p className="text-sm font-bold text-[#173d5e]">{previewShown ? "Claim this reward to open its saved gift-card number. The sample above is for demonstration only." : "Claim this retailer gift card to reveal its barcode and number."}</p>
    <button ref={claimButton} type="submit" disabled={expired || pending || state.status === "succeeded" || needsCheck} className="mt-4 min-h-12 w-full rounded-xl bg-[#31e800] px-4 text-base font-black text-[#062218] disabled:opacity-60">
      {expired ? "Claim deadline passed" : pending ? "Claiming…" : state.status === "succeeded" ? "Reward claimed" : "Claim reward"}
    </button>
    {state.status !== "idle" ? <p ref={claimStatus} tabIndex={-1} role="status" className={`mt-3 text-xs font-bold ${state.status === "error" ? "text-[#a32900]" : "text-[#08721c]"}`}>{state.message}</p> : null}
    {expired || needsCheck ? <AccountReadRetryLink className="mt-3 inline-block text-sm font-bold text-[#0069b3] underline" href={checkHref ?? `/account/wallet?rewardId=${encodeURIComponent(rewardId)}#reward-pass`}>Check this reward →</AccountReadRetryLink> : null}
  </form>{introOpen ? <ClaimIdentityIntro historyScope={introScope} busy={skipping} error={skipError} onSkipDemo={previewShown ? skipDemoAndClaim : undefined} onClose={closeClaimReview} onContinue={() => { setIntroOpen(false); setVerificationOpen(true); }} /> : null}
  {verificationOpen ? <DemoVerificationDialog rewardId={rewardId} historyScope={verificationScope} onClose={closeClaimReview} onComplete={() => {
    dismissedVerification.current = true;
    setVerificationOpen(false);
    form.current?.requestSubmit();
  }} /> : null}</>;
}
