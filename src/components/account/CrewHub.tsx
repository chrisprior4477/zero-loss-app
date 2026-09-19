"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  inviteToCrew, removeCrewConnection, respondToCrewRequest, setEntryCrewSharing,
} from "@/lib/crew/actions";
import type { CrewInvitation, OwnCrewEntry, SharedCrewPick } from "@/app/account/crew/page";
import { SharedPicksConcept } from "@/components/home/SharedPicksConcept";

type Tab = "crew" | "requests" | "picks";
type Props = {
  currentUserId: string;
  invitations: CrewInvitation[];
  entries: OwnCrewEntry[];
  selectedMemberId: string | null;
  selectedPicks: SharedCrewPick[];
  available: boolean;
  initialTab: Tab;
};

const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

export function CrewHub({ currentUserId, invitations, entries, selectedMemberId, selectedPicks, available, initialTab }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [samplePerson, setSamplePerson] = useState<"Maya" | "Daniel" | null>(null);
  const [pending, startTransition] = useTransition();
  const received = invitations.filter((item) => item.status === "pending" && item.recipient_id === currentUserId);
  const sent = invitations.filter((item) => item.status === "pending" && item.requester_id === currentUserId);
  const connected = invitations.filter((item) => item.status === "accepted");

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  function member(item: CrewInvitation) {
    const isRequester = item.requester_id === currentUserId;
    return { id: isRequester ? item.recipient_id : item.requester_id, name: isRequester ? item.recipient_name : item.requester_name };
  }

  return <main className="min-h-screen bg-[#061b35] px-4 py-8 text-white sm:px-6 lg:px-10">
    <div className="mx-auto max-w-6xl">
      <Link href="/account/entries" className="text-sm font-semibold text-cyan-300 hover:text-cyan-100">‹ My Activity</Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-5 border-b border-cyan-300/25 pb-6">
        <div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-cyan-300">Friends &amp; family</p><h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">Your Crew</h1><p className="mt-2 max-w-2xl text-white/70">See what your approved Crew chooses to share. Your own entries stay private unless you switch sharing on for each pick.</p></div>
        <span className="rounded-full border border-[#61f344]/45 bg-[#61f344]/10 px-4 py-2 text-sm font-bold text-[#8cff7b]">{connected.length} connected</span>
      </div>

      {!available ? <p role="alert" className="mt-5 rounded-xl border border-amber-400/45 bg-amber-500/10 p-4 text-sm">Crew sharing is temporarily unavailable. No picks were exposed or changed.</p> : null}
      {message ? <p role="status" className="mt-5 rounded-xl border border-cyan-300/45 bg-[#0c3657] p-4 text-sm">{message}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Your Crew sections">
        {([["crew", "Your Crew"], ["requests", `Requests${received.length ? ` (${received.length})` : ""}`], ["picks", "My shared picks"]] as const).map(([key, label]) =>
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-lg border px-4 py-2.5 text-sm font-bold transition ${tab === key ? "border-cyan-300 bg-[#0e6383] text-white shadow-[0_0_15px_#27cafa66]" : "border-cyan-300/25 bg-[#0a2947] text-white/75 hover:border-cyan-300"}`}>{label}</button>) }
      </div>

      {tab === "crew" ? <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.65fr)]" aria-label="Approved Crew">
        <div className="rounded-2xl border border-cyan-300/45 bg-[#092744] p-5 shadow-[0_0_22px_#00b9ff22]">
          <h2 className="text-xl font-extrabold">People in your Crew</h2>
          {connected.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {connected.map((item) => { const person = member(item); return <div key={item.id} className="rounded-xl border border-cyan-300/25 bg-[#061d38] p-4">
              <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full border-2 border-cyan-300 bg-[#12536a] font-black">{person.name.slice(0,1).toUpperCase()}</span><div><strong className="block">{person.name}</strong><small className="text-[#83f98b]">Connected</small></div></div>
              <div className="mt-4 flex flex-wrap gap-2"><Link href={`/account/crew?member=${person.id}`} className="rounded-lg bg-[#54ee42] px-3 py-2 text-xs font-black text-[#061b26] hover:bg-[#8fff7c]">Shared picks →</Link><button type="button" disabled={pending} onClick={() => run(() => removeCrewConnection(item.id))} className="rounded-lg border border-white/25 px-3 py-2 text-xs font-bold text-white/70 hover:text-white">Remove</button></div>
            </div>; })}
          </div> : <p className="mt-4 rounded-xl border border-dashed border-cyan-300/30 p-5 text-sm text-white/70">No approved connections yet. Invite someone you know; they must accept before shared picks appear.</p>}
          <div className="mt-5 rounded-xl border border-cyan-300/25 bg-[#061d38] p-4"><p className="text-xs font-extrabold uppercase tracking-[.15em] text-cyan-300">Fictional click-through preview</p><p className="mt-1 text-sm text-white/65">Explore compact, swipeable sample picks from Maya and Daniel. These are not real members.</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => setSamplePerson("Maya")} className="rounded-lg border border-cyan-300 px-3 py-2 text-sm font-bold text-cyan-200">Maya’s shared picks →</button><button type="button" onClick={() => setSamplePerson("Daniel")} className="rounded-lg border border-cyan-300 px-3 py-2 text-sm font-bold text-cyan-200">Daniel’s shared picks →</button></div></div>
        </div>
        <div className="rounded-2xl border border-cyan-300/35 bg-[#092744] p-5">
          <h2 className="text-xl font-extrabold">Add to Your Crew</h2><p className="mt-2 text-sm leading-6 text-white/70">Invite a friend or family member by email. We won’t reveal whether an address belongs to an account.</p>
          <form onSubmit={(event) => { event.preventDefault(); run(async () => { const result = await inviteToCrew(email); if (result.ok) setEmail(""); return result; }); }} className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col">
            <label className="sr-only" htmlFor="crew-email">Email address</label><input id="crew-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Friend’s email address" className="min-w-0 flex-1 rounded-lg border border-cyan-300/40 bg-[#061b35] px-4 py-3 text-sm outline-none focus:border-cyan-200" />
            <button disabled={pending || !available} type="submit" className="rounded-lg bg-[#51ed40] px-4 py-3 text-sm font-black text-[#061b26] disabled:opacity-50">Send request</button>
          </form>
          <p className="mt-3 text-xs leading-5 text-white/55">No picks, entry amounts, wallet balances, or rewards become public. A Crew member sees only entries you explicitly share.</p>
        </div>
        {selectedMemberId ? <div className="rounded-2xl border border-cyan-300/45 bg-[#092744] p-5 lg:col-span-2" id="shared-picks">
          <h2 className="text-xl font-extrabold">Shared picks</h2><p className="mt-1 text-sm text-white/65">Only picks this person chose to share with approved Crew.</p>
          {selectedPicks.length ? <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-3">{selectedPicks.map((pick) => <Link href={`/items/${pick.offeringSlug}`} key={pick.offeringSlug} className="w-52 shrink-0 snap-start overflow-hidden rounded-xl border border-cyan-300/35 bg-[#061d38] hover:border-cyan-200"><div className="relative h-32 bg-[#102c4a]"><Image src={pick.image} alt="" fill sizes="208px" className="object-contain p-2" /></div><div className="p-3"><small className="text-cyan-300">{pick.retailer}</small><strong className="mt-1 block text-sm">{pick.title}</strong><span className="mt-2 block text-xs text-white/50">Shared {formatDate(pick.sharedAt)}</span></div></Link>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-white/20 p-5 text-sm text-white/65">No picks shared with Crew yet.</p>}
        </div> : null}
      </section> : null}

      {tab === "requests" ? <section className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-cyan-300/40 bg-[#092744] p-5"><h2 className="text-xl font-extrabold">Requests for you</h2>{received.length ? <div className="mt-4 grid gap-3">{received.map((item) => <article key={item.id} className="rounded-xl border border-cyan-300/25 bg-[#061d38] p-4"><strong>{item.requester_name} wants to join your Crew</strong><p className="mt-1 text-xs text-white/60">Requested {formatDate(item.created_at)}. Accepting does not share your existing picks.</p><div className="mt-3 flex gap-2"><button type="button" disabled={pending} onClick={() => run(() => respondToCrewRequest(item.id, true))} className="rounded-lg bg-[#51ed40] px-3 py-2 text-sm font-black text-[#061b26]">Approve</button><button type="button" disabled={pending} onClick={() => run(() => respondToCrewRequest(item.id, false))} className="rounded-lg border border-white/30 px-3 py-2 text-sm font-bold">Decline</button></div></article>)}</div> : <p className="mt-4 text-sm text-white/65">No requests waiting for approval.</p>}</div>
        <div className="rounded-2xl border border-cyan-300/40 bg-[#092744] p-5"><h2 className="text-xl font-extrabold">Requests you sent</h2>{sent.length ? <div className="mt-4 grid gap-3">{sent.map((item) => <article key={item.id} className="rounded-xl border border-cyan-300/25 bg-[#061d38] p-4"><strong>{item.recipient_name}</strong><p className="mt-1 text-xs text-white/60">Waiting for approval since {formatDate(item.created_at)}.</p><button type="button" disabled={pending} onClick={() => run(() => removeCrewConnection(item.id))} className="mt-3 text-sm font-bold text-cyan-300">Cancel request</button></article>)}</div> : <p className="mt-4 text-sm text-white/65">No outgoing requests.</p>}</div>
      </section> : null}

      {tab === "picks" ? <section className="mt-5 rounded-2xl border border-cyan-300/40 bg-[#092744] p-5" id="sharing"><h2 className="text-xl font-extrabold">Choose what your Crew can see</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">Sharing is off by default. You can change each entry here at any time. Turning sharing off removes it immediately from approved Crew views; it does not retract your entry or change your purchase options.</p>
        {entries.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{entries.map((entry) => <article key={entry.id} className="flex gap-3 rounded-xl border border-cyan-300/25 bg-[#061d38] p-3">{entry.image ? <div className="relative h-20 w-20 shrink-0 rounded-lg bg-[#123956]"><Image src={entry.image} alt="" fill sizes="80px" className="object-contain p-1" /></div> : null}<div className="min-w-0 flex-1"><strong className="block text-sm">{entry.title}</strong><small className="block text-white/55">{entry.retailer} · {formatDate(entry.createdAt)}</small><button type="button" disabled={pending || !available} onClick={() => run(() => setEntryCrewSharing(entry.id, !entry.shared))} aria-pressed={entry.shared} className={`mt-2 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${entry.shared ? "border-[#51ed40] bg-[#153f2e] text-[#8aff75]" : "border-white/30 text-white/75"}`}>{entry.shared ? "Shared with Crew · turn off" : "Private · share with Crew"}</button></div></article>)}</div> : <p className="mt-4 text-sm text-white/60">You don’t have entries to share yet.</p>}
      </section> : null}
    </div>
    {samplePerson ? <SharedPicksConcept initialPerson={samplePerson} onClose={() => setSamplePerson(null)} /> : null}
  </main>;
}
