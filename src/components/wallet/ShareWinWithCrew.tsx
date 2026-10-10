"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { shareWinWithCrew } from "@/lib/crew/actions";

export type WinShareCrewMember = { id: string; name: string };

export function ShareWinWithCrew({ rewardId, members }: { rewardId: string; members: WinShareCrewMember[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function share() {
    if (!selected.length || pending || saved) return;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await shareWinWithCrew(rewardId, selected);
        setError(!result.ok);
        setSaved(result.ok);
        setMessage(result.message);
      } catch {
        setError(true);
        setMessage("We couldn’t confirm the share. Refresh and check before trying again.");
      }
    });
  }

  return <section aria-labelledby="share-win-heading" className="mt-6 rounded-2xl border border-cyan-300/25 bg-[#06223d] p-5 text-white">
    <h2 id="share-win-heading" className="text-xl font-black">Share this win with your Crew</h2>
    <p className="mt-2 text-sm text-[#b5cce4]">This is optional. Select approved people; their email preference decides whether they receive an email. Your gift-card number and private entry details are never shared.</p>
    {members.length ? <>
      <div className="mt-4 flex flex-wrap gap-3">
        {members.map(member => <label key={member.id} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={selected.includes(member.id)} disabled={pending || saved} onChange={event => { setSelected(current => event.target.checked ? [...current, member.id] : current.filter(id => id !== member.id)); setMessage(""); }} />{member.name}</label>)}
      </div>
      <button type="button" className="mt-4 min-h-11 rounded-xl bg-[#00b9ff] px-5 py-2 font-black text-[#00132e] disabled:opacity-50" disabled={!selected.length || pending || saved} onClick={share}>{pending ? "Saving…" : saved ? "Share saved" : "Share win with selected Crew"}</button>
    </> : <p className="mt-4 text-sm">You don’t have any approved Crew members yet. <Link href="/account/crew" className="font-bold text-cyan-200 underline">Manage your Crew</Link></p>}
    {message ? <p role={error ? "alert" : "status"} className="mt-3 text-sm font-semibold">{message}</p> : null}
  </section>;
}
