"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { getOwnWinShareRecipients, shareWinWithCrew } from "@/lib/crew/actions";

export type WinShareCrewMember = { id: string; name: string };

const noRecipients: string[] = [];

export function ShareWinWithCrew({ rewardId, members, initialShared = noRecipients }: { rewardId: string; members: WinShareCrewMember[]; initialShared?: string[] | null }) {
  const [selected, setSelected] = useState<string[]>([]);
  const currentSelection = selected.filter(id => members.some(member => member.id === id));
  const [pending, startTransition] = useTransition();
  const [shared, setShared] = useState<Set<string>>(() => new Set(initialShared ?? []));
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [needsCheck, setNeedsCheck] = useState(initialShared === null);
  const snapshot = initialShared === null ? null : JSON.stringify([...initialShared].sort());
  const [previousSnapshot, setPreviousSnapshot] = useState(snapshot);
  if (snapshot !== previousSnapshot) {
    setPreviousSnapshot(snapshot);
    setNeedsCheck(initialShared === null);
    if (initialShared) {
      const recipients = new Set(initialShared);
      setShared(recipients);
      setSelected(current => current.filter(id => !recipients.has(id)));
    }
  }

  async function checkSharedRecipients() {
    try {
      const ids = await getOwnWinShareRecipients(rewardId);
      if (ids) {
        setShared(new Set(ids));
        setSelected(current => current.filter(id => !ids.includes(id)));
        setNeedsCheck(false);
        return ids;
      }
    } catch { /* Keep the already-confirmed recipients visible. */ }
    setNeedsCheck(true);
    return null;
  }

  function share() {
    if (!currentSelection.length || pending || needsCheck) return;
    setMessage("");
    startTransition(async () => {
      const result = await shareWinWithCrew(rewardId, currentSelection).catch(() => null);
      if (result?.ok) {
        setShared(current => new Set([...current, ...currentSelection]));
        setSelected([]);
        setError(false);
        setMessage(result.message);
        return;
      }
      const recipients = await checkSharedRecipients();
      const verifiedCount = currentSelection.filter(id => recipients?.includes(id)).length;
      setError(verifiedCount !== currentSelection.length);
      if (verifiedCount === currentSelection.length) setMessage("Your win was shared with the selected Crew members.");
      else if (verifiedCount) setMessage("Some shares were confirmed. You can retry for the recipients still selected.");
      else if (recipients) setMessage(result?.message ?? "The selected shares weren’t saved. You can try again.");
      else {
        setMessage("We couldn’t confirm the share. Check which shares were saved before trying again.");
      }
    });
  }

  return <section aria-labelledby="share-win-heading" className="mt-6 rounded-2xl border border-cyan-300/25 bg-[#06223d] p-5 text-white">
    <h2 id="share-win-heading" className="text-xl font-black">Share this win with your Crew</h2>
    <p className="mt-2 text-sm text-[#b5cce4]">Choose which connected Crew members to share this win with. They’ll get an email if they’ve turned on win updates. Your gift-card number and entry details stay private.</p>
    {needsCheck ? <div className="mt-2">
      <p role="status" className="text-sm">Check the saved recipients before sending this win update.</p>
      <button type="button" disabled={pending} className="mt-2 min-h-11 rounded-xl bg-[#bdeafa] px-4 font-bold text-[#00132e]" onClick={() => startTransition(async () => {
        const checked = await checkSharedRecipients();
        setError(!checked);
        setMessage(checked ? "Saved recipients checked." : "We couldn’t load the saved recipients. Check again.");
      })}>{pending ? "Checking…" : "Check share status"}</button>
    </div> : null}
    {members.length ? <>
      <div className="mt-4 flex flex-wrap gap-3">
        {members.map(member => <label key={member.id} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={selected.includes(member.id)} disabled={pending || shared.has(member.id)} onChange={event => { setSelected(current => event.target.checked ? [...current, member.id] : current.filter(id => id !== member.id)); setMessage(""); }} />{member.name}{shared.has(member.id) ? " · Shared" : ""}</label>)}
      </div>
      <button type="button" className="mt-4 min-h-11 rounded-xl bg-[#00b9ff] px-5 py-2 font-black text-[#00132e] disabled:opacity-50" disabled={!currentSelection.length || pending || needsCheck} onClick={share}>{pending ? "Saving…" : "Share win with selected Crew"}</button>
    </> : <p className="mt-4 text-sm">You don’t have any connected Crew members yet. <Link href="/account/crew" className="font-bold text-cyan-200 underline">Manage your Crew</Link></p>}
    {message ? <p role={error ? "alert" : "status"} className="mt-3 text-sm font-semibold">{message}</p> : null}
  </section>;
}
