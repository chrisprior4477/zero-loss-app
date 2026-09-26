"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  getCrewSharedPicks, removeCrewConnection, requestCrewInvitationFromLink, respondToCrewRequest, setCrewDiscoverable, setEntryCrewSharing,
} from "@/lib/crew/actions";
import type { CrewInvitation, CrewMember, OwnCrewEntry, SharedCrewPick } from "@/app/account/crew/page";
import { CrewPeopleCarousel } from "./CrewPeopleCarousel";
import crewStyles from "./crew-people.module.css";
import styles from "./crew-dashboard.module.css";
import { CrewSearchPanel } from "./CrewSearchDialog";
import { SharedPicksConcept } from "@/components/home/SharedPicksConcept";
import { initializeSampleCrewPreview, removeSampleCrewPreview, useSampleCrewPreviews, type SampleCrewName } from "@/lib/crew/sample-preview";
import { StatusTicket } from "./StatusTicket";
import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { AccountIcon } from "./AccountIcon";

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
  overview?: { balanceLabel: string; fundingEnabled: boolean; activity: AccountActivity };
  ownInviteToken?: string | null;
  incomingInviteToken?: string | null;
};

const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

export function CrewHub({ currentUserId, invitations, members, discoverable, entries, selectedMemberId, selectedPicks, available, initialTab, overview, ownInviteToken = null, incomingInviteToken = null }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [message, setMessage] = useState("");
  const [samplePerson, setSamplePerson] = useState<SampleCrewName | null>(null);
  const [openMemberId, setOpenMemberId] = useState<string | null>(selectedMemberId);
  const [memberPicks, setMemberPicks] = useState<SharedCrewPick[]>(selectedPicks);
  const [memberPicksError, setMemberPicksError] = useState(false);
  const [memberPicksLoading, setMemberPicksLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [incomingRequestSent, setIncomingRequestSent] = useState(false);
  const pickRequest = useRef(0);
  const crewRailRef = useRef<HTMLDivElement>(null);
  const selectedPersonRef = useRef<HTMLDivElement>(null);
  const activityPanelRef = useRef<HTMLElement>(null);
  const initialSampleSelected = useRef(false);
  const [pending, startTransition] = useTransition();
  const samples = useSampleCrewPreviews();
  useEffect(() => { initializeSampleCrewPreview(); }, []);
  useEffect(() => { if (ownInviteToken) setInviteUrl(`${window.location.origin}/account/crew?invite=${ownInviteToken}`); }, [ownInviteToken]);
  useEffect(() => {
    if (initialSampleSelected.current || selectedMemberId || !samples.length) return;
    initialSampleSelected.current = true;
    setSamplePerson(samples[0]);
  }, [samples, selectedMemberId]);
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

  async function copyInviteLink() {
    if (!ownInviteToken) { setCopyMessage("Invite links are unavailable right now. Use name, email, or verified phone below."); return; }
    const url = inviteUrl || `${window.location.origin}/account/crew?invite=${ownInviteToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("Invite link copied. Anyone who opens it can request to join; you still approve the request.");
    } catch {
      setCopyMessage("Copy was blocked by your browser. Select the link above and copy it manually.");
    }
  }

  function requestFromInviteLink() {
    if (!incomingInviteToken) return;
    startTransition(async () => {
      const result = await requestCrewInvitationFromLink(incomingInviteToken);
      setMessage(result.message);
      if (result.ok) { setIncomingRequestSent(true); router.refresh(); }
    });
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
  const readyRewards = overview ? readyWalletRewards(overview.activity) : [];
  const singleReward = readyRewards.length === 1 ? readyRewards[0] : null;
  const optionsCount = overview?.activity.source === "unavailable" ? null : overview?.activity.activity.filter(item => item.status === "completion").length;

  return <main className={styles.page}>
    <div className={styles.shell}>
      {overview ? <div className={styles.statusTickets} aria-label="Your account overview">
        <StatusTicket variant="wallet" size="crew" label="Playable Wallet" value={overview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={overview.fundingEnabled ? `${walletHistoryHref}#add-funds` : undefined} actionDisabled={!overview.fundingEnabled} />
        <StatusTicket variant="reward" size="crew" label="Prize Ready" value={overview.activity.source === "unavailable" ? "Unavailable" : String(readyRewards.length)} action={singleReward ? "View reward" : "View rewards"} href={singleReward ? walletRewardHref(singleReward) : accountRoutes.rewards} />
        <StatusTicket variant="option" size="crew" label="Purchase Options" value={optionsCount === null || optionsCount === undefined ? "Unavailable" : String(optionsCount)} action="Review options" href={accountRoutes.purchaseOptions} />
      </div> : null}
      <header className={styles.pageHeading}>
        <div><h1>Your Crew</h1><p>The people you brought with you.</p></div>
        <div className={styles.counts}><span>{connected.length} connected</span>{samples.length ? <span>{samples.length} sample previews</span> : null}</div>
      </header>

      {incomingInviteToken ? <section className={styles.incomingInvite} aria-label="Crew invite request"><div><strong>Someone invited you to connect</strong><p>Send a request from your account. They’ll approve it before either of you can see shared picks.</p></div><button type="button" disabled={pending || incomingRequestSent} onClick={requestFromInviteLink}>{incomingRequestSent ? "Request sent" : "Request to join"}</button></section> : null}

      {!available ? <p role="alert" className="mt-5 rounded-xl border border-amber-400/45 bg-amber-500/10 p-4 text-sm">Crew sharing is temporarily unavailable. No picks were exposed or changed.</p> : null}
      {message ? <p role="status" className="mt-5 rounded-xl border border-cyan-300/45 bg-[#0c3657] p-4 text-sm">{message}</p> : null}

      <div className={styles.tabs} role="tablist" aria-label="Your Crew sections">
        {([["crew", "Your Crew"], ["requests", `Requests${received.length ? ` (${received.length})` : ""}`], ["picks", "My shared picks"]] as const).map(([key, label]) =>
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>) }
      </div>

      {tab === "crew" ? <section className={styles.crewSection} aria-label="Approved Crew">
        <div className={crewStyles.outlineStage}>
          <CrewPeopleCarousel railRef={crewRailRef} selectedRef={selectedPersonRef} people={people} samples={samples} selectedKey={activeKey} onAdd={focusCrewSearch} onRemove={(id) => run(() => removeCrewConnection(id))} onSampleRemove={(name) => { removeSampleCrewPreview(name); if (samplePerson === name) setSamplePerson(null); }} onSamplePicks={selectSample} onMemberPicks={selectMember} pending={pending} />
          <div className={styles.crewGrid}>
            <div className={styles.activityColumn}>
              {samplePerson ? <SharedPicksConcept key={samplePerson} person={samplePerson} onClose={() => setSamplePerson(null)} connectedOutline accountMode panelRef={activityPanelRef} /> : null}
              {activeMember ? <div id="shared-picks">
                {memberPicksError ? <section ref={activityPanelRef} className={crewStyles.activityError}><p role="alert">We couldn’t load this Crew member’s activity. Please try again.</p></section> :
                  <SharedPicksConcept key={activeMember.memberId} person={activeMember.name} avatarUrl={activeMember.avatarUrl} loading={memberPicksLoading} picks={memberPicks.map((pick) => ({ title: pick.title, retailer: pick.retailer, image: pick.image, slug: pick.offeringSlug, note: `Shared ${formatDate(pick.sharedAt)}` }))} onClose={() => setOpenMemberId(null)} connectedOutline accountMode panelRef={activityPanelRef} />}
              </div> : null}
              {!samplePerson && !activeMember ? <section className={styles.activityPlaceholder} aria-label="Crew member activity"><span>YOUR CREW · SHARED ACTIVITY</span><h2>Choose someone to explore</h2><p>Select a person above to see the picks they’ve chosen to share.</p></section> : null}
            </div>
            <aside className={styles.sidebar} aria-label="Crew tools">
              <section className={styles.sideTicket}><Image src="/account/drawer/your-crew-exact-324x180.png" alt="" width={112} height={62} className={styles.inviteArt} /><span className={styles.sideEyebrow}>GROW YOUR CREW</span><h2>Invite someone</h2><p>Share your personal link with someone who isn’t in your Crew. They can request to join, and you approve before sharing begins.</p><input className={styles.inviteUrl} aria-label="Your Crew invite link" value={inviteUrl} placeholder={ownInviteToken ? "Preparing invite link…" : "Invite link unavailable"} readOnly onFocus={(event) => event.currentTarget.select()} /><div className={styles.inviteActions}><button type="button" onClick={() => void copyInviteLink()} disabled={!ownInviteToken}>Copy invite link</button><button type="button" onClick={focusCrewSearch}>Search or send request <span aria-hidden="true">→</span></button></div>{copyMessage ? <p className={styles.copyMessage} role="status">{copyMessage}</p> : null}</section>
              <section className={styles.sideTicket}><span className={styles.sideEyebrow}>LIVE UPDATES</span><h2>Real crew activity</h2><span className={styles.crewIcon}><AccountIcon name="crew" /></span><p>{connected.length ? `You have ${connected.length} approved ${connected.length === 1 ? "connection" : "connections"}. Select a member to see only the picks they’ve shared.` : "No approved crew activity yet. Updates will appear after someone accepts your invitation and chooses to share."}</p></section>
            </aside>
          </div>
        </div>
        <CrewSearchPanel onSamplePicks={selectSample} disabled={!available} />
        <div className="rounded-2xl border border-cyan-300/35 bg-[#092744] p-5">
          <label className="flex items-start gap-3 text-sm text-white/80"><input type="checkbox" checked={discoverable} disabled={pending || !available} onChange={(event) => run(() => setCrewDiscoverable(event.target.checked))} className="mt-1 accent-[#51ed40]" /><span>Let other members find my display name in Crew search. <small className="mt-1 block text-white/50">Off by default. This never shares your entries or wallet.</small></span></label>
        </div>
      </section> : null}

      {tab === "requests" ? <section className={styles.utilityGrid}>
        <div className={styles.utilityPanel}><h2>Requests for you</h2>{received.length ? <div className={styles.utilityList}>{received.map((item) => <article key={item.id} id={`crew-request-${item.id}`} className={styles.utilityItem}><strong>{item.requester_name} wants to join your Crew</strong><p>Requested {formatDate(item.created_at)}. Accepting does not share your existing picks.</p><div className={styles.utilityActions}><button type="button" disabled={pending} onClick={() => run(() => respondToCrewRequest(item.id, true))} className={styles.approveButton}>Approve</button><button type="button" disabled={pending} onClick={() => run(() => respondToCrewRequest(item.id, false))} className={styles.secondaryButton}>Decline</button></div></article>)}</div> : <p className={styles.emptyUtility}>No requests waiting for approval.</p>}</div>
        <div className={styles.utilityPanel}><h2>Requests you sent</h2>{sent.length ? <div className={styles.utilityList}>{sent.map((item) => <article key={item.id} className={styles.utilityItem}><strong>{item.recipient_name}</strong><p>Waiting for approval since {formatDate(item.created_at)}.</p><button type="button" disabled={pending} onClick={() => run(() => removeCrewConnection(item.id))} className={styles.cancelButton}>Cancel request</button></article>)}</div> : <p className={styles.emptyUtility}>No outgoing requests.</p>}</div>
      </section> : null}

      {tab === "picks" ? <section className={styles.utilityPanelWide} id="sharing"><h2>Choose what your Crew can see</h2><p className={styles.utilityIntro}>Sharing is off by default. You can change each entry here at any time. Turning sharing off removes it immediately from approved Crew views; it does not retract your entry or change your purchase options.</p>
        {entries.length ? <div className={styles.shareGrid}>{entries.map((entry) => <article key={entry.id} className={styles.shareItem}>{entry.image ? <div className={styles.shareImage}><Image src={entry.image} alt="" fill sizes="80px" className="object-contain p-1" /></div> : null}<div className={styles.shareDetails}><strong>{entry.title}</strong><small>{entry.retailer} · {formatDate(entry.createdAt)}</small><button type="button" disabled={pending || !available} onClick={() => run(() => setEntryCrewSharing(entry.id, !entry.shared))} aria-pressed={entry.shared} className={entry.shared ? styles.sharedToggle : styles.privateToggle}>{entry.shared ? "Shared with Crew · turn off" : "Private · share with Crew"}</button></div></article>)}</div> : <p className={styles.emptyUtility}>You don’t have entries to share yet.</p>}
      </section> : null}
    </div>
  </main>;
}
