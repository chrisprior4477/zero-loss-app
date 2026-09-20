"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  getCrewSharedPicks, removeCrewConnection, respondToCrewRequest, setCrewDiscoverable, setEntryCrewSharing,
} from "@/lib/crew/actions";
import type { CrewInvitation, CrewMember, OwnCrewEntry, SharedCrewPick } from "@/app/account/crew/page";
import { CrewPeopleCarousel } from "./CrewPeopleCarousel";
import { CrewSearchPanel } from "./CrewSearchDialog";
import { SharedPicksConcept } from "@/components/home/SharedPicksConcept";
import { initializeSampleCrewPreview, removeSampleCrewPreview, useSampleCrewPreviews, type SampleCrewName } from "@/lib/crew/sample-preview";

type Tab = "crew" | "requests" | "picks";
type Props = {
  currentUserId: string;
  invitations: CrewInvitation[];
  members: CrewMember[];
  discoverable: boolean;
  entries: OwnCrewEntry[];
  selectedMemberId: string | null;
  selectedPicks: SharedCrewPick[];
  available: boolean;
  initialTab: Tab;
};

const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

export function CrewHub({ currentUserId, invitations, members, discoverable, entries, selectedMemberId, selectedPicks, available, initialTab }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [message, setMessage] = useState("");
  const [samplePerson, setSamplePerson] = useState<SampleCrewName | null>(null);
  const [openMemberId, setOpenMemberId] = useState<string | null>(selectedMemberId);
  const [memberPicks, setMemberPicks] = useState<SharedCrewPick[]>(selectedPicks);
  const [memberPicksError, setMemberPicksError] = useState(false);
  const [memberPicksLoading, setMemberPicksLoading] = useState(false);
  const pickRequest = useRef(0);
  const [pending, startTransition] = useTransition();
  const samples = useSampleCrewPreviews();
  useEffect(() => { initializeSampleCrewPreview(); }, []);
  const received = invitations.filter((item) => item.status === "pending" && item.recipient_id === currentUserId);
  const sent = invitations.filter((item) => item.status === "pending" && item.requester_id === currentUserId);
  const connected = invitations.filter((item) => item.status === "accepted");
  const memberProfiles = new Map(members.map((person) => [person.memberId, person]));
  const people = connected.map((item) => {
    const person = member(item);
    const profile = memberProfiles.get(person.id);
    return { memberId: person.id, invitationId: item.id, name: profile?.name ?? person.name, avatarUrl: profile?.avatarUrl ?? null };
  });

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

  function focusCrewSearch() {
    const section = document.getElementById("crew-search");
    section?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    document.getElementById("crew-search-name")?.focus({ preventScroll: true });
  }

  function selectSample(name: SampleCrewName) {
    pickRequest.current += 1;
    setOpenMemberId(null);
    setMemberPicksLoading(false);
    setSamplePerson((current) => current === name ? null : name);
  }

  function selectMember(id: string) {
    pickRequest.current += 1;
    const request = pickRequest.current;
    setSamplePerson(null);
    if (openMemberId === id) { setOpenMemberId(null); setMemberPicksLoading(false); return; }
    setOpenMemberId(id);
    setMemberPicks([]);
    setMemberPicksError(false);
    setMemberPicksLoading(true);
    startTransition(async () => {
      const result = await getCrewSharedPicks(id);
      if (pickRequest.current !== request) return;
      setMemberPicks(result.picks);
      setMemberPicksError(!result.ok);
      setMemberPicksLoading(false);
    });
  }

  const activeMember = people.find((person) => person.memberId === openMemberId);
  const activeKey = samplePerson ? `sample-${samplePerson}` : openMemberId;

  return <main className="min-h-screen bg-[#061b35] px-4 py-8 text-white sm:px-6 lg:px-10">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-cyan-300/25 pb-6">
        <div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-cyan-300">Friends &amp; family</p><h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">Your Crew</h1><p className="mt-2 max-w-2xl text-white/70">See what your approved Crew chooses to share. Your own entries stay private unless you switch sharing on for each pick.</p></div>
        <div className="flex flex-wrap gap-2"><span className="rounded-full border border-[#61f344]/45 bg-[#61f344]/10 px-4 py-2 text-sm font-bold text-[#8cff7b]">{connected.length} connected</span>{samples.length ? <span className="rounded-full border border-orange-300/40 bg-orange-300/10 px-4 py-2 text-sm font-bold text-orange-200">{samples.length} sample previews</span> : null}</div>
      </div>

      {!available ? <p role="alert" className="mt-5 rounded-xl border border-amber-400/45 bg-amber-500/10 p-4 text-sm">Crew sharing is temporarily unavailable. No picks were exposed or changed.</p> : null}
      {message ? <p role="status" className="mt-5 rounded-xl border border-cyan-300/45 bg-[#0c3657] p-4 text-sm">{message}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Your Crew sections">
        {([["crew", "Your Crew"], ["requests", `Requests${received.length ? ` (${received.length})` : ""}`], ["picks", "My shared picks"]] as const).map(([key, label]) =>
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-lg border px-4 py-2.5 text-sm font-bold transition ${tab === key ? "border-cyan-300 bg-[#0e6383] text-white shadow-[0_0_15px_#27cafa66]" : "border-cyan-300/25 bg-[#0a2947] text-white/75 hover:border-cyan-300"}`}>{label}</button>) }
      </div>

      {tab === "crew" ? <section className="mt-5 grid gap-5" aria-label="Approved Crew">
        <div>
          <CrewPeopleCarousel people={people} samples={samples} selectedKey={activeKey} onAdd={focusCrewSearch} onRemove={(id) => run(() => removeCrewConnection(id))} onSampleRemove={(name) => { removeSampleCrewPreview(name); if (samplePerson === name) setSamplePerson(null); }} onSamplePicks={selectSample} onMemberPicks={selectMember} pending={pending} />
          {samplePerson ? <SharedPicksConcept key={samplePerson} person={samplePerson} onClose={() => setSamplePerson(null)} /> : null}
          {activeMember ? <div id="shared-picks">
            {memberPicksError ? <p role="alert" className="border border-cyan-300/45 bg-[#092744] p-5 text-sm">We couldn’t load this Crew member’s activity. Please try again.</p> :
              <SharedPicksConcept key={activeMember.memberId} person={activeMember.name} avatarUrl={activeMember.avatarUrl} loading={memberPicksLoading} picks={memberPicks.map((pick) => ({ title: pick.title, retailer: pick.retailer, image: pick.image, slug: pick.offeringSlug, note: `Shared ${formatDate(pick.sharedAt)}` }))} onClose={() => setOpenMemberId(null)} />}
          </div> : null}
        </div>
        <CrewSearchPanel onSamplePicks={selectSample} disabled={!available} />
        <div className="rounded-2xl border border-cyan-300/35 bg-[#092744] p-5">
          <label className="flex items-start gap-3 text-sm text-white/80"><input type="checkbox" checked={discoverable} disabled={pending || !available} onChange={(event) => run(() => setCrewDiscoverable(event.target.checked))} className="mt-1 accent-[#51ed40]" /><span>Let other members find my display name in Crew search. <small className="mt-1 block text-white/50">Off by default. This never shares your entries or wallet.</small></span></label>
        </div>
      </section> : null}

      {tab === "requests" ? <section className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-cyan-300/40 bg-[#092744] p-5"><h2 className="text-xl font-extrabold">Requests for you</h2>{received.length ? <div className="mt-4 grid gap-3">{received.map((item) => <article key={item.id} className="rounded-xl border border-cyan-300/25 bg-[#061d38] p-4"><strong>{item.requester_name} wants to join your Crew</strong><p className="mt-1 text-xs text-white/60">Requested {formatDate(item.created_at)}. Accepting does not share your existing picks.</p><div className="mt-3 flex gap-2"><button type="button" disabled={pending} onClick={() => run(() => respondToCrewRequest(item.id, true))} className="rounded-lg bg-[#51ed40] px-3 py-2 text-sm font-black text-[#061b26]">Approve</button><button type="button" disabled={pending} onClick={() => run(() => respondToCrewRequest(item.id, false))} className="rounded-lg border border-white/30 px-3 py-2 text-sm font-bold">Decline</button></div></article>)}</div> : <p className="mt-4 text-sm text-white/65">No requests waiting for approval.</p>}</div>
        <div className="rounded-2xl border border-cyan-300/40 bg-[#092744] p-5"><h2 className="text-xl font-extrabold">Requests you sent</h2>{sent.length ? <div className="mt-4 grid gap-3">{sent.map((item) => <article key={item.id} className="rounded-xl border border-cyan-300/25 bg-[#061d38] p-4"><strong>{item.recipient_name}</strong><p className="mt-1 text-xs text-white/60">Waiting for approval since {formatDate(item.created_at)}.</p><button type="button" disabled={pending} onClick={() => run(() => removeCrewConnection(item.id))} className="mt-3 text-sm font-bold text-cyan-300">Cancel request</button></article>)}</div> : <p className="mt-4 text-sm text-white/65">No outgoing requests.</p>}</div>
      </section> : null}

      {tab === "picks" ? <section className="mt-5 rounded-2xl border border-cyan-300/40 bg-[#092744] p-5" id="sharing"><h2 className="text-xl font-extrabold">Choose what your Crew can see</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">Sharing is off by default. You can change each entry here at any time. Turning sharing off removes it immediately from approved Crew views; it does not retract your entry or change your purchase options.</p>
        {entries.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{entries.map((entry) => <article key={entry.id} className="flex gap-3 rounded-xl border border-cyan-300/25 bg-[#061d38] p-3">{entry.image ? <div className="relative h-20 w-20 shrink-0 rounded-lg bg-[#123956]"><Image src={entry.image} alt="" fill sizes="80px" className="object-contain p-1" /></div> : null}<div className="min-w-0 flex-1"><strong className="block text-sm">{entry.title}</strong><small className="block text-white/55">{entry.retailer} · {formatDate(entry.createdAt)}</small><button type="button" disabled={pending || !available} onClick={() => run(() => setEntryCrewSharing(entry.id, !entry.shared))} aria-pressed={entry.shared} className={`mt-2 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${entry.shared ? "border-[#51ed40] bg-[#153f2e] text-[#8aff75]" : "border-white/30 text-white/75"}`}>{entry.shared ? "Shared with Crew · turn off" : "Private · share with Crew"}</button></div></article>)}</div> : <p className="mt-4 text-sm text-white/60">You don’t have entries to share yet.</p>}
      </section> : null}
    </div>
  </main>;
}
