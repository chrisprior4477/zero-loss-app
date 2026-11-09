"use client";
import { useAccountTimeZone } from "./TimeZoneProvider";
import Link from "next/link";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import {
  getCrewSharedPicks, setCrewShareBack, removeCrewConnection, requestCrewInvitationFromLink, respondToCrewRequest,
} from "@/lib/crew/actions";
import type { CrewInvitation, CrewMember, OwnCrewEntry, SharedCrewPick } from "@/app/account/crew/page";
import { CrewConnectedGallery, CrewSharePicker } from "./CrewConnectedGallery";
import { CrewInlineFinder } from "./CrewInlineFinder";
import connectedStyles from "./crew-connected.module.css";
import { CrewLandingScroll } from "./CrewLandingScroll";
import { StatusTicket } from "./StatusTicket";
import stripStyles from "./account-status-strip.module.css";
import styles from "./crew-dashboard.module.css";
import firstStyles from "./crew-people-first.module.css";
import { CrewSharedPicks } from "./CrewSharedPicks";

import { samplePicks } from "@/components/home/SharedPicksConcept";
import { initializeSampleCrewPreview, removeSampleCrewPreview, useSampleCrewPreviews, type SampleCrewName } from "@/lib/crew/sample-preview";
import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { CrewDisplaySettings } from "./CrewDisplaySettings";
import { defaultCrewVisibilityRule, type crewVisibilitySnapshot } from "@/lib/crew/visibility";
import { useCrewTab } from "./useCrewTab";
import type { CrewTab } from "@/lib/crew/navigation";
import { crewViewReturnKey, readCrewViewReturn, readCrewPickDestination } from "@/lib/crew/view-return";

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
  initialTab: CrewTab;
  overview?: { balanceLabel: string; fundingEnabled: boolean; activity: AccountActivity };
  ownInviteToken?: string | null;
  incomingInviteToken?: string | null;
};

const formatDate = (value: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone }).format(new Date(value));
const subscribeToOrigin = () => () => {};
const getBrowserOrigin = () => window.location.origin;
const getServerOrigin = () => "";

export function CrewHub({ currentUserId, invitations, members, discoverable, discovery, entries, selectedMemberId, selectedPicks, available, initialTab, overview, ownInviteToken = null, incomingInviteToken = null, visibility, visibilityAvailable = true }: Props) {
  const timeZone = useAccountTimeZone();
  const router = useRouter();
  const { tab, selectTab } = useCrewTab(initialTab);
  const [finding, setFinding] = useState(initialTab === "add");
  const [sharing, setSharing] = useState(false);
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
    setFinding(current => !current);
  }

  function openCrewSearch() {
    setFinding(true);
    requestAnimationFrame(() => document.getElementById("crew-query")?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  }

  useEffect(() => {
    if (finding) document.getElementById("crew-query")?.focus({ preventScroll: true });
  }, [finding]);

  async function copyInviteLink() {
    if (!ownInviteToken) { setCopyMessage("Invite links are unavailable right now. Use name, email, or verified phone below."); return; }
    const url = inviteUrl || `${window.location.origin}/account/crew?invite=${ownInviteToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("Invite link copied. Anyone who opens it can join your Crew and leave at any time.");
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

  function selectSample(name: SampleCrewName) {
    forgetReturn();
    pickRequest.current += 1;
    setOpenMemberId(null);
    setMemberPicksLoading(false);
    setSamplePerson(name);
    setMemberPicksError(false);
  }

  const loadMember = useCallback((id: string) => {
    pickRequest.current += 1;
    const request = pickRequest.current;
    setSamplePerson(null);
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
  }, []);

  function selectMember(id: string, retry = false) {
    if (openMemberId === id && !retry) return;
    forgetReturn();
    loadMember(id);
  }

  function forgetReturn() {
    const next = { ...window.history.state };
    delete next[crewViewReturnKey];
    window.history.replaceState(next, "");
  }

  const memberKeys = people.map(person => person.memberId).join(",");
  const sampleKeys = samples.join(",");
  useLayoutEffect(() => {
    function restorePerson() {
      const saved = readCrewViewReturn(window.history.state, currentUserId, window.location.href) ?? readCrewPickDestination(window.location.href);
      if (!saved) return;
      if (saved.selectedKey.startsWith("sample-")) {
        const name = sampleKeys.split(",").find(name => `sample-${name}` === saved.selectedKey) as SampleCrewName | undefined;
        if (!name) return;
        initialSampleSelected.current = true;
        pickRequest.current += 1;
        setOpenMemberId(null);
        setMemberPicksLoading(false);
        setMemberPicksError(false);
        setSamplePerson(name);
      } else if (memberKeys.split(",").includes(saved.selectedKey)) {
        initialSampleSelected.current = true;
        loadMember(saved.selectedKey);
      }
    }
    restorePerson();
    window.addEventListener("popstate", restorePerson);
    window.addEventListener("pageshow", restorePerson);
    return () => { window.removeEventListener("popstate", restorePerson); window.removeEventListener("pageshow", restorePerson); };
  }, [currentUserId, memberKeys, sampleKeys, loadMember]);

  const activeMember = people.find((person) => person.memberId === openMemberId);
  const activeKey = samplePerson ? `sample-${samplePerson}` : openMemberId;
  const readyRewards = overview ? readyWalletRewards(overview.activity) : [];
  const singleReward = readyRewards.length === 1 ? readyRewards[0] : null;
  const optionsCount = overview?.activity.source === "unavailable" ? null : overview?.activity.activity.filter(item => item.status === "completion").length;

  return <main className={styles.page}>
    <div className={styles.shell}>
      {overview ? <div className={stripStyles.row} aria-label="Your account overview">
        <StatusTicket variant="wallet" size="top" label="Playable Wallet" value={overview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={overview.fundingEnabled ? `${walletHistoryHref}&panel=funding#add-funds` : undefined} actionDisabled={!overview.fundingEnabled} />
        <StatusTicket variant="reward" size="top" label="Prize Ready" value={overview.activity.source === "unavailable" ? "Unavailable" : String(readyRewards.length)} action={singleReward ? "View reward" : "View rewards"} href={singleReward ? walletRewardHref(singleReward) : accountRoutes.rewards} />
        <StatusTicket variant="option" size="top" label="Purchase Options" value={optionsCount === null || optionsCount === undefined ? "Unavailable" : String(optionsCount)} action="Continue with Purchase" href={accountRoutes.purchaseOptions} />
      </div> : null}
    <CrewLandingScroll ownerId={currentUserId} enabled={initialTab === "crew" && !selectedMemberId && !incomingInviteToken} />
    <header id="crew-intro" className={connectedStyles.heading}>
        <div><h1>Your Crew</h1><p>The people you brought with you.</p><p><span>{connected.length} connected</span>{samples.length ? <span>{samples.length} sample previews</span> : null}</p></div>
        <button type="button" aria-expanded={finding} onClick={focusCrewSearch}>Add people</button>
      </header>

      {finding ? <div>
        <CrewInlineFinder available={available} onSample={name => { selectSample(name); selectTab("crew"); setFinding(false); }} onClose={() => setFinding(false)} />
        <details className={connectedStyles.inviteLink}><summary>Invite with your personal link</summary><p>They can join your Crew and leave whenever they like.</p><input aria-label="Your Crew invite link" value={inviteUrl} placeholder={ownInviteToken ? "Preparing invite link…" : "Invite link unavailable"} readOnly onFocus={event => event.currentTarget.select()} /><button type="button" onClick={() => void copyInviteLink()} disabled={!ownInviteToken}>Copy invite link</button>{copyMessage ? <p role="status">{copyMessage}</p> : null}</details>
      </div> : null}

      {incomingInviteToken ? <section className={styles.incomingInvite} aria-label="Crew invite request"><div><strong>Someone invited you to connect</strong><p>Join to receive their shared finds. Your own picks stay private until you choose to share back, and you can leave at any time.</p></div><button type="button" disabled={pending || incomingRequestSent} onClick={requestFromInviteLink}>{incomingRequestSent ? "Joined" : "Join Crew"}</button></section> : null}

      {!available ? <p role="alert" className="mt-5 rounded-xl border border-amber-400/45 bg-amber-500/10 p-4 text-sm">Crew sharing is temporarily unavailable. No picks were exposed or changed.</p> : null}
      {message ? <p role="status" className="mt-5 rounded-xl border border-cyan-300/45 bg-[#0c3657] p-4 text-sm">{message}</p> : null}

      <nav className={connectedStyles.navigation} aria-label="Your Crew sections">
        <div className={connectedStyles.mainButtons}>
          <button type="button" aria-pressed={tab === "crew"} onClick={() => selectTab("crew")}>Your Crew</button>
          <button type="button" aria-pressed={tab === "groups"} onClick={() => selectTab("groups")}>Groups</button>
          <Link href="/account/favorites?tab=shared">Shared with You</Link>
        </div>
        <button type="button" className={connectedStyles.sharingButton} aria-pressed={tab === "picks"} onClick={() => selectTab("picks")}>Shared Picks &amp; Cleanup</button>
      </nav>
      {tab === "crew" ? <>
        <CrewConnectedGallery ownerId={currentUserId} people={people} samples={samples} selectedKey={activeKey}
          picks={memberPicks.map(pick => ({ title: pick.title, retailer: pick.retailer, image: pick.image, slug: pick.offeringSlug, note: `${pick.shareKind === "win" ? "Shared win" : "Shared"} ${formatDate(pick.sharedAt, timeZone)}` }))}
          loading={Boolean(activeMember) && memberPicksLoading} error={Boolean(activeMember) && memberPicksError} pending={pending}
          onMember={selectMember} onSample={selectSample} onRetry={() => { if (activeMember) selectMember(activeMember.memberId, true); }}
          onShareBack={(id, enabled) => run(() => setCrewShareBack(id, enabled))} onRemove={id => run(() => removeCrewConnection(id))} onSampleRemove={name => { removeSampleCrewPreview(name); if (samplePerson === name) setSamplePerson(samples.find(other => other !== name) ?? null); }}
          onShare={() => setSharing(true)} onAdd={openCrewSearch} />
        <section className={connectedStyles.inviteStrip}><div><h2>Good finds are better shared.</h2><p>Bring someone along. Give them a reason to come back.</p></div><button type="button" onClick={openCrewSearch}>Add people +</button></section>
      </> : null}
      {sharing ? <CrewSharePicker products={[...new Map([...memberPicks.map(pick => ({ ...pick, slug: pick.offeringSlug })), ...Object.values(samplePicks).flat()].map(pick => [pick.slug, pick])).values()]} onClose={() => setSharing(false)} /> : null}

      <div className={firstStyles.content} hidden={tab !== "groups" && tab !== "privacy"}>
        <CrewDisplaySettings key={JSON.stringify([visibility, entries.filter(entry => entry.shared).map(entry => entry.id)])} embedded section={tab === "groups" ? "groups" : "privacy"} available={available && visibilityAvailable} initialDiscoverable={discoverable} initialDiscovery={discovery} initialDefaultRule={visibility?.defaultRule ?? defaultCrewVisibilityRule} initialGroups={visibility?.groups ?? []} initialEntryRules={visibility?.entryRules ?? {}} members={members.map(member => ({ id: member.memberId, name: member.name }))} sharedPicks={entries.filter(entry => entry.shared)} />
      </div>

      {tab === "requests" ? <section className={styles.utilityGrid}>
        <div className={styles.utilityPanel}><h2>Requests for you</h2>{received.length ? <div className={styles.utilityList}>{received.map((item) => <article key={item.id} id={`crew-request-${item.id}`} className={styles.utilityItem}><strong>{item.requester_name} wants to join your Crew</strong><p>Requested {formatDate(item.created_at, timeZone)}. Accepting does not share your existing picks.</p><div className={styles.utilityActions}><button type="button" disabled={pending} onClick={() => run(() => respondToCrewRequest(item.id, true))} className={styles.approveButton}>Approve</button><button type="button" disabled={pending} onClick={() => run(() => respondToCrewRequest(item.id, false))} className={styles.secondaryButton}>Decline</button></div></article>)}</div> : <p className={styles.emptyUtility}>No requests waiting for approval.</p>}</div>
        <div className={styles.utilityPanel}><h2>Requests you sent</h2>{sent.length ? <div className={styles.utilityList}>{sent.map((item) => <article key={item.id} className={styles.utilityItem}><strong>{item.recipient_name}</strong><p>Waiting for approval since {formatDate(item.created_at, timeZone)}.</p><button type="button" disabled={pending} onClick={() => run(() => removeCrewConnection(item.id))} className={styles.cancelButton}>Cancel request</button></article>)}</div> : <p className={styles.emptyUtility}>No outgoing requests.</p>}</div>
      </section> : null}

      {tab === "picks" ? <CrewSharedPicks entries={entries} available={available && visibilityAvailable}
        groups={visibility?.groups ?? []} defaultRule={visibility?.defaultRule ?? defaultCrewVisibilityRule}
        rules={visibility?.entryRules ?? {}} onPrivacy={() => selectTab("privacy")} /> : null}
      <p className={firstStyles.footer}>Your entries stay private unless you choose to share them. Your wallet and payment details are never shared with Crew.</p>
    </div>
  </main>;
}
