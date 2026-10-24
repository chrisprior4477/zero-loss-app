"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import {
  getCrewSharedPicks, removeCrewConnection, requestCrewInvitationFromLink, respondToCrewRequest, setEntryCrewSharing,
} from "@/lib/crew/actions";
import type { CrewInvitation, CrewMember, OwnCrewEntry, SharedCrewPick } from "@/app/account/crew/page";
import { CrewPeopleFirst } from "./CrewPeopleFirst";
import { CrewLandingScroll } from "./CrewLandingScroll";
import { StatusTicket } from "./StatusTicket";
import stripStyles from "./account-status-strip.module.css";
import styles from "./crew-dashboard.module.css";
import firstStyles from "./crew-people-first.module.css";
import { CrewSearchPanel } from "./CrewSearchDialog";
import { SharedPicksConcept } from "@/components/home/SharedPicksConcept";
import { initializeSampleCrewPreview, removeSampleCrewPreview, useSampleCrewPreviews, type SampleCrewName } from "@/lib/crew/sample-preview";
import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { CrewDisplaySettings } from "./CrewDisplaySettings";
import { defaultCrewVisibilityRule, type crewVisibilitySnapshot } from "@/lib/crew/visibility";

type Tab = "crew" | "requests" | "picks" | "groups" | "privacy" | "add";
type Props = {
  visibility?: ReturnType<typeof crewVisibilitySnapshot>;
  visibilityAvailable?: boolean;
  currentUserId: string;
  invitations: CrewInvitation[];
  members: CrewMember[];
  discoverable: boolean;
  discovery?: { real: boolean; email: boolean; phone: boolean };
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
const subscribeToOrigin = () => () => {};
const getBrowserOrigin = () => window.location.origin;
const getServerOrigin = () => "";

export function CrewHub({ currentUserId, invitations, members, discoverable, discovery, entries, selectedMemberId, selectedPicks, available, initialTab, overview, ownInviteToken = null, incomingInviteToken = null, visibility, visibilityAvailable = true }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [message, setMessage] = useState("");
  const [samplePerson, setSamplePerson] = useState<SampleCrewName | null>(null);
  const [openMemberId, setOpenMemberId] = useState<string | null>(selectedMemberId);
  const [memberPicks, setMemberPicks] = useState<SharedCrewPick[]>(selectedPicks);
  const [memberPicksError, setMemberPicksError] = useState(false);
  const [memberPicksLoading, setMemberPicksLoading] = useState(false);
  const origin = useSyncExternalStore(subscribeToOrigin, getBrowserOrigin, getServerOrigin);
  const inviteUrl = ownInviteToken && origin ? `${origin}/account/crew?invite=${ownInviteToken}` : "";
  const [copyMessage, setCopyMessage] = useState("");
  const [incomingRequestSent, setIncomingRequestSent] = useState(false);
  const pickRequest = useRef(0);
  const activityPanelRef = useRef<HTMLElement>(null);
  const initialSampleSelected = useRef(false);
  const [pending, startTransition] = useTransition();
  const samples = useSampleCrewPreviews();
  useEffect(() => { initializeSampleCrewPreview(); }, []);
  useEffect(() => {
    if (initialSampleSelected.current || selectedMemberId || !samples.length) return;
    initialSampleSelected.current = true;
    setSamplePerson(samples.includes("Maya") ? "Maya" : samples[0]);
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
      const result = await action().catch(() => ({ ok: false, message: "We couldn’t confirm that change. Please refresh to check your saved Crew before trying again." }));
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  function member(item: CrewInvitation) {
    const isRequester = item.requester_id === currentUserId;
    return { id: isRequester ? item.recipient_id : item.requester_id, name: isRequester ? item.recipient_name : item.requester_name };
  }

  function focusCrewSearch() {
    setTab("add");
  }

  useEffect(() => {
    if (tab === "add") document.getElementById("crew-search-name")?.focus({ preventScroll: true });
  }, [tab]);

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
      const result = await requestCrewInvitationFromLink(incomingInviteToken).catch(() => ({ ok: false, message: "We couldn’t confirm the request. Please try again." }));
      setMessage(result.message);
      if (result.ok) { setIncomingRequestSent(true); router.refresh(); }
    });
  }

  function selectSample(name: SampleCrewName, forceOpen = false) {
    pickRequest.current += 1;
    setOpenMemberId(null);
    setMemberPicksLoading(false);
    setSamplePerson((current) => current === name && !forceOpen ? null : name);
  }

  function selectMember(id: string, retry = false) {
    pickRequest.current += 1;
    const request = pickRequest.current;
    setSamplePerson(null);
    if (openMemberId === id && !retry) { setOpenMemberId(null); setMemberPicksLoading(false); return; }
    setOpenMemberId(id);
    setMemberPicks([]);
    setMemberPicksError(false);
    setMemberPicksLoading(true);
    startTransition(async () => {
      const result = await getCrewSharedPicks(id).catch(() => ({ ok: false, picks: [] }));
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
      {overview ? <div className={stripStyles.row} aria-label="Your account overview">
        <StatusTicket variant="wallet" size="top" label="Playable Wallet" value={overview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={overview.fundingEnabled ? `${walletHistoryHref}#add-funds` : undefined} actionDisabled={!overview.fundingEnabled} />
        <StatusTicket variant="reward" size="top" label="Prize Ready" value={overview.activity.source === "unavailable" ? "Unavailable" : String(readyRewards.length)} action={singleReward ? "View reward" : "View rewards"} href={singleReward ? walletRewardHref(singleReward) : accountRoutes.rewards} />
        <StatusTicket variant="option" size="top" label="Purchase Options" value={optionsCount === null || optionsCount === undefined ? "Unavailable" : String(optionsCount)} action="Continue with Purchase" href={accountRoutes.purchaseOptions} />
      </div> : null}
    <CrewLandingScroll enabled={initialTab === "crew" && !selectedMemberId && !incomingInviteToken} />
    <header id="crew-intro" className={firstStyles.heading}>
        <div><h1>Your Crew</h1><p>The people you brought with you.</p><p><span>{connected.length} connected</span>{samples.length ? <span>{samples.length} sample previews</span> : null}</p></div>
        <button type="button" className={firstStyles.addButton} onClick={focusCrewSearch}>Add people</button>
      </header>

      {incomingInviteToken ? <section className={styles.incomingInvite} aria-label="Crew invite request"><div><strong>Someone invited you to connect</strong><p>Send a request from your account. They’ll approve it before either of you can see shared picks.</p></div><button type="button" disabled={pending || incomingRequestSent} onClick={requestFromInviteLink}>{incomingRequestSent ? "Request sent" : "Request to join"}</button></section> : null}

      {!available ? <p role="alert" className="mt-5 rounded-xl border border-amber-400/45 bg-amber-500/10 p-4 text-sm">Crew sharing is temporarily unavailable. No picks were exposed or changed.</p> : null}
      {message ? <p role="status" className="mt-5 rounded-xl border border-cyan-300/45 bg-[#0c3657] p-4 text-sm">{message}</p> : null}

      <nav className={firstStyles.tabs} aria-label="Your Crew sections">
        {([["crew", "Your Crew"], ["requests", `Requests${received.length ? ` (${received.length})` : ""}`], ["picks", "My shared picks"], ["groups", "Groups"], ["privacy", "Privacy"]] as const).map(([key, label]) =>
          <button key={key} type="button" aria-label={label} aria-pressed={tab === key} onClick={() => setTab(key)}>{key === "picks" ? <span>My shared<br />picks</span> : key === "crew" ? <span>Your<span className={firstStyles.crewTabSecondLine}> Crew</span></span> : label}</button>) }
      </nav>

      {tab === "crew" ? <section className={styles.crewSection} aria-label="Approved Crew">
          <CrewPeopleFirst people={people} samples={samples} selectedKey={activeKey} onAdd={focusCrewSearch} onRemove={(id) => run(() => removeCrewConnection(id))} onSampleRemove={(name) => { removeSampleCrewPreview(name); if (samplePerson === name) setSamplePerson(null); }} onSamplePicks={selectSample} onMemberPicks={selectMember} pending={pending} />
              {samplePerson ? <SharedPicksConcept key={samplePerson} person={samplePerson} onClose={() => setSamplePerson(null)} peopleFirst connectedOutline accountMode panelRef={activityPanelRef} /> : null}
              {activeMember ? <div id="shared-picks">
                {memberPicksError ? <section ref={activityPanelRef}><p role="alert">We couldn’t load this Crew member’s activity. Please try again.</p><button type="button" className={firstStyles.retry} onClick={() => selectMember(activeMember.memberId, true)}>Retry shared activity</button></section> :
                  <SharedPicksConcept key={activeMember.memberId} person={activeMember.name} avatarUrl={activeMember.avatarUrl} loading={memberPicksLoading} picks={memberPicks.map((pick) => ({ title: pick.title, retailer: pick.retailer, image: pick.image, slug: pick.offeringSlug, note: `${pick.shareKind === "win" ? "Shared win update" : "Shared"} ${formatDate(pick.sharedAt)}` }))} onClose={() => setOpenMemberId(null)} peopleFirst connectedOutline accountMode panelRef={activityPanelRef} />}
              </div> : null}
              {!samplePerson && !activeMember ? <section className={styles.activityPlaceholder} aria-label="Crew member activity"><span>YOUR CREW · SHARED ACTIVITY</span><h2>Choose someone to explore</h2><p>Select a person above to see the picks they’ve chosen to share.</p></section> : null}
      </section> : null}

      {tab === "add" ? <section className={firstStyles.addPanel} aria-label="Add people"><button type="button" className={firstStyles.back} onClick={() => setTab("crew")}>← Back to your people</button>
        <CrewSearchPanel compact onSamplePicks={name => { selectSample(name, true); setTab("crew"); }} disabled={!available} />
        <details className={firstStyles.invite}><summary>Invite with your personal link</summary><p>They can request to join. You approve before sharing begins.</p><input aria-label="Your Crew invite link" value={inviteUrl} placeholder={ownInviteToken ? "Preparing invite link…" : "Invite link unavailable"} readOnly onFocus={event => event.currentTarget.select()} /><button type="button" onClick={() => void copyInviteLink()} disabled={!ownInviteToken}>Copy invite link</button>{copyMessage ? <p role="status">{copyMessage}</p> : null}</details>
      </section> : null}

      <div className={firstStyles.content} hidden={tab !== "groups" && tab !== "privacy"}>
        <CrewDisplaySettings embedded section={tab === "groups" ? "groups" : "privacy"} available={available && visibilityAvailable} initialDiscoverable={discoverable} initialDiscovery={discovery} initialDefaultRule={visibility?.defaultRule ?? defaultCrewVisibilityRule} initialGroups={visibility?.groups ?? []} initialEntryRules={visibility?.entryRules ?? {}} members={members.map(member => ({ id: member.memberId, name: member.name }))} sharedPicks={entries.filter(entry => entry.shared)} />
      </div>

      {tab === "requests" ? <section className={styles.utilityGrid}>
        <div className={styles.utilityPanel}><h2>Requests for you</h2>{received.length ? <div className={styles.utilityList}>{received.map((item) => <article key={item.id} id={`crew-request-${item.id}`} className={styles.utilityItem}><strong>{item.requester_name} wants to join your Crew</strong><p>Requested {formatDate(item.created_at)}. Accepting does not share your existing picks.</p><div className={styles.utilityActions}><button type="button" disabled={pending} onClick={() => run(() => respondToCrewRequest(item.id, true))} className={styles.approveButton}>Approve</button><button type="button" disabled={pending} onClick={() => run(() => respondToCrewRequest(item.id, false))} className={styles.secondaryButton}>Decline</button></div></article>)}</div> : <p className={styles.emptyUtility}>No requests waiting for approval.</p>}</div>
        <div className={styles.utilityPanel}><h2>Requests you sent</h2>{sent.length ? <div className={styles.utilityList}>{sent.map((item) => <article key={item.id} className={styles.utilityItem}><strong>{item.recipient_name}</strong><p>Waiting for approval since {formatDate(item.created_at)}.</p><button type="button" disabled={pending} onClick={() => run(() => removeCrewConnection(item.id))} className={styles.cancelButton}>Cancel request</button></article>)}</div> : <p className={styles.emptyUtility}>No outgoing requests.</p>}</div>
      </section> : null}

      {tab === "picks" ? <section className={styles.utilityPanelWide} id="sharing"><h2>Choose what your Crew can see</h2><p className={styles.utilityIntro}>Sharing is off by default. You can change each entry here at any time. Turning sharing off removes it immediately from approved Crew views; it does not retract your entry or change your purchase options.</p>
        <button type="button" className={firstStyles.privacyLink} onClick={() => setTab("privacy")}>How to display my picks · choose who sees them</button>
        {entries.length ? <div className={styles.shareGrid}>{entries.map((entry) => <article key={entry.id} className={styles.shareItem}>{entry.image ? <div className={styles.shareImage}><Image src={entry.image} alt="" fill sizes="80px" className="object-contain p-1" /></div> : null}<div className={styles.shareDetails}><strong>{entry.title}</strong><small>{entry.retailer} · {formatDate(entry.createdAt)}</small><button type="button" disabled={pending || !available} onClick={() => run(() => setEntryCrewSharing(entry.id, !entry.shared))} aria-pressed={entry.shared} className={entry.shared ? styles.sharedToggle : styles.privateToggle}>{entry.shared ? "Shared with Crew · turn off" : "Private · share with Crew"}</button></div></article>)}</div> : <p className={styles.emptyUtility}>You don’t have entries to share yet.</p>}
      </section> : null}
      <p className={firstStyles.footer}>Your entries stay private unless you choose to share them. Your wallet and payment details are never shared with Crew.</p>
    </div>
  </main>;
}
