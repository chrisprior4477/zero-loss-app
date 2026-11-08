"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { resetDemoPool, type DemoPoolResetResult } from "@/lib/catalog/actions";
import { waitForDemoResetReply } from "@/lib/preview/demo-reset-reply";

export function ResetDemoPoolButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [needsCheck, setNeedsCheck] = useState(false);
  const inFlight = useRef(false);

  const reset = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await waitForDemoResetReply<DemoPoolResetResult>(() => resetDemoPool(slug, needsCheck), {
        status: "error", recovery: "check", message: "We couldn’t confirm the pool count. Check it when you’re connected.",
      });
      setMessage(result.message);
      setNeedsCheck(result.status === "error" && result.recovery === "check");
      if (result.status === "succeeded") {
        setConfirming(false);
        router.refresh();
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      {!confirming ? (
        <button type="button" onClick={() => { setConfirming(true); setMessage(""); }} className="min-h-12 w-full rounded-xl border border-[#ff5a69] bg-[#e52b40] px-5 py-3 text-center font-extrabold text-white transition hover:bg-[#f33c50] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
          {needsCheck ? "Check pool" : "Reset Pool"}
        </button>
      ) : (
        <div className="rounded-xl border border-[#ff5a69] bg-[#321525] p-4 text-sm text-white" role="group" aria-label="Confirm demo pool reset">
          <p className="font-extrabold">{needsCheck ? "Check whether this demo pool is open" : "Reset this demo pool to one ticket left?"}</p>
          <p className="mt-1 leading-5 text-white/75">{needsCheck ? "Read the latest ticket count for this pool." : "This changes only the fictional sample-ticket count. Existing entries, results, and purchase options stay saved."}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="min-h-11 rounded-lg border border-white/45 px-3 font-bold transition hover:bg-white/10 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => void reset()} disabled={busy} className="min-h-11 rounded-lg bg-[#e52b40] px-3 font-extrabold transition hover:bg-[#f33c50] disabled:opacity-50">{needsCheck ? (busy ? "Checking…" : "Check pool") : (busy ? "Resetting…" : "Reset Pool")}</button>
          </div>
        </div>
      )}
      {message ? <p role="status" className="mt-2 text-sm font-semibold text-cyan-200">{message}</p> : null}
    </div>
  );
}
