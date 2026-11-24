"use client";
import { revealBelowHeader } from "@/lib/account/landing-position";
import { useAccountLocale, useAccountTimeZone } from "./TimeZoneProvider";
import Link from "next/link";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore, useTransition, type MouseEvent } from "react";
import {
  getCrewSharedPicks, setCrewShareBack, removeCrewConnection, readCrewInviteLinkStatus, requestCrewInvitationFromLink, respondToCrewRequest,
} from "@/lib/crew/actions";
import type { CrewInvitation, CrewMember, OwnCrewEntry, SharedCrewPick } from "@/app/account/crew/page";
import { PRODUCT_SHARE_EVENT } from "@/lib/sharing/product-share";
import { CrewConnectedGallery, CrewSharePicker } from "./CrewConnectedGallery";
import { CrewInlineFinder } from "./CrewInlineFinder";
import connectedStyles from "./crew-connected.module.css";
import { AccountSettingsLandingScroll } from "./AccountSettingsLandingScroll";
import { HelpLandingScroll } from "@/components/help/HelpLandingScroll";
import { CrewLandingScroll } from "./CrewLandingScroll";
import { StatusTicket } from "./StatusTicket";
import stripStyles from "./account-status-strip.module.css";
import styles from "./crew-dashboard.module.css";
import firstStyles from "./crew-people-first.module.css";
import { CrewSharedPicks } from "./CrewSharedPicks";

import { samplePicks, type CrewActivityPick } from "@/components/home/SharedPicksConcept";
import { initializeSampleCrewPreview, removeSampleCrewPreview, useSampleCrewPreviews, type SampleCrewName } from "@/lib/crew/sample-preview";
import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { CrewDisplaySettings } from "./CrewDisplaySettings";
import { defaultCrewVisibilityRule, type crewVisibilitySnapshot } from "@/lib/crew/visibility";
import { useDialogBack } from "./useDialogBack";
import { rememberCrewSectionFocus, useCrewTab } from "./useCrewTab";
import { restoreDialogTrigger } from "./dialog-keyboard";
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
  selectedPicksUnavailable?: boolean;
  bookmarkedMember?: string;
  bookmarkedPick?: string;
  selectedPicks: SharedCrewPick[];
  available: boolean;
  initialTab: CrewTab;
  entryReturn?: string;
  overview?: { balanceLabel: string; fundingEnabled: boolean; activity: AccountActivity };
  ownInviteToken?: string | null;
  incomingInviteToken?: string | null;
  invalidInvite?: boolean;
};

const formatDate = (value: string, timeZone: string, locale: string) => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone }).format(new Date(value));
const subscribeToOrigin = () => () => {};
const getBrowserOrigin = () => window.location.origin;
const getServerOrigin = () => "";

export function CrewHub({ currentUserId, invitations, members, discoverable, discovery, entries, selectedMemberId, selectedPicks, selectedPicksUnavailable = false, bookmarkedMember, bookmarkedPick, available, initialTab, entryReturn, overview, ownInviteToken = null, incomingInviteToken = null, invalidInvite = false, visibility, visibilityAvailable = true }: Props) {
  const timeZone = useAccountTimeZone();
  const locale = useAccountLocale();
  const router = useRouter();
  const { tab, selectTab, invalidTab } = useCrewTab(initialTab);
  const [finding, setFinding] = useState(initialTab === "add");
  const [finderVisit, setFinderVisit] = useState(initialTab === "add" ? 1 : 0);
  const [sharing, setSharing] = useState<{ recipientId?: string } | null>(null);
  const shareOpener = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState("");
  const [samplePerson, setSamplePerson] = useState<SampleCrewName | null>(null);
  const [openMemberId, setOpenMemberId] = useState<string | null>(selectedMemberId);
  const [memberPicks, setMemberPicks] = useState<SharedCrewPick[]>(selectedPicks);
  const [memberPicksError, setMemberPicksError] = useState(selectedPicksUnavailable);
  const [memberPicksLoading, setMemberPicksLoading] = useState(false);
  const origin = useSyncExternalStore(subscribeToOrigin, getBrowserOrigin, getServerOrigin);
  const inviteUrl = ownInviteToken && origin ? `${origin}/account/crew?invite=${ownInviteToken}` : "";
  const [copyMessage, setCopyMessage] = useState("");
  const inviteField = useRef<HTMLInputElement>(null);
  const [incomingRequestSent, setIncomingRequestSent] = useState(false);
  const pickRequest = useRef(0);
  const finderOpener = useRef<HTMLButtonElement>(null);
  const headerFinderButton = useRef<HTMLButtonElement>(null);
  const syncFinder = useEffectEvent(() => {
    const open = new URLSearchParams(window.location.search).get("tab") === "add" || Boolean(window.history.state?.["zeroLossDialog-crew-quick-finder"]);
    if (open) {
      setFinderVisit(visit => visit || 1);
      setFinding(true);
    } else if (finding) closeCrewSearch();
  });
  useEffect(() => {
    const onHistory = () => syncFinder();
    window.addEventListener("popstate", onHistory);
    return () => window.removeEventListener("popstate", onHistory);
  }, []);
  const initialSampleSelected = useRef(false);
  const [pending, startTransition] = useTransition();
  const samples = useSampleCrewPreviews();
  useEffect(() => { initializeSampleCrewPreview(); }, []);
  useEffect(() => {
    if (initialSampleSelected.current || selectedMemberId || bookmarkedMember || !samples.length) return;
    initialSampleSelected.current = true;
    setSamplePerson(samples.includes("Maya") ? "Maya" : samples[0]);
  }, [samples, selectedMemberId, bookmarkedMember]);
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

  useDialogBack(finding && initialTab !== "add", closeCrewSearch, false, true, false, "crew-quick-finder", () => setFinding(true));
  const lastSharePicker = useRef<{ recipientId?: string } | null>(null);
  const cancelShareHandOff = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelShareHandOff.current?.(), []);
  const endSharePicker = useDialogBack(Boolean(sharing), () => {
    lastSharePicker.current = sharing;
    setSharing(null);
  }, false, true, false, "crew-find-to-share", () => {
    if (tab === "crew" && shareOpener.current?.isConnected) setSharing(lastSharePicker.current);
  });
  function handOffShare(product: CrewActivityPick & { recipientId?: string }) {
    cancelShareHandOff.current?.();
    const href = window.location.href;
    let frame = 0;
    function cancel() {
      window.removeEventListener("popstate", dispatch);
      window.removeEventListener("keydown", escape, true);
      cancelAnimationFrame(frame);
      cancelShareHandOff.current = null;
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cancel();
      shareOpener.current?.focus({ preventScroll: true });
    }
    function dispatch() {
      frame = requestAnimationFrame(() => {
        cancel();
        if (window.location.href !== href || !shareOpener.current?.isConnected) return;
        shareOpener.current.focus({ preventScroll: true });
        window.dispatchEvent(new CustomEvent(PRODUCT_SHARE_EVENT, { detail: product }));
      });
    }
    cancelShareHandOff.current = cancel;
    window.addEventListener("keydown", escape, true);
    if (window.history.state?.["zeroLossDialog-crew-find-to-share"]) {
      window.addEventListener("popstate", dispatch, { once: true });
      endSharePicker();
    } else {
      setSharing(null);
      dispatch();
    }
  }
  function closeCrewSearch() {
    setFinding(false);
    if (new URLSearchParams(window.location.search).get("tab") === "add") selectTab("crew");
    const opener = finderOpener.current;
    const trigger = opener?.isConnected ? opener : headerFinderButton.current;
    requestAnimationFrame(() => restoreDialogTrigger(trigger, true));
  }

  function openCrewSearch(event: MouseEvent<HTMLButtonElement>, scroll = true) {
    finderOpener.current = event.currentTarget;
    setFinderVisit(visit => visit + 1);
    setFinding(true);
    if (scroll) requestAnimationFrame(() => document.getElementById("crew-query")?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  }

  useEffect(() => {
    if (!finding) return;
    const field = document.getElementById("crew-query");
    if (!field) return;
    field.focus({ preventScroll: true });
    const bounds = field.getBoundingClientRect();
    const header = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
    const viewport = window.visualViewport;
    if (bounds.top < header + 12 || bounds.bottom > (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 12) {
      revealBelowHeader(field);
    }
  }, [finding]);

  async function copyInviteLink() {
    if (!ownInviteToken) { setCopyMessage("Invite links are unavailable right now. Use name, email, or verified phone below."); return; }
    const url = inviteUrl || `${window.location.origin}/account/crew?invite=${ownInviteToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("Invite link copied. Anyone who opens it can join your Crew and leave at any time.");
    } catch {
      setCopyMessage("Copy was blocked by your browser. Select the link above and copy it manually.");
      inviteField.current?.focus();
      inviteField.current?.select();
    }
  }

  useEffect(() => {
    if (!incomingInviteToken || incomingInviteToken === ownInviteToken) return;
    let active = true;
    void readCrewInviteLinkStatus(incomingInviteToken).then(status => {
      if (active && status === "joined") setIncomingRequestSent(true);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [incomingInviteToken, ownInviteToken]);

  function requestFromInviteLink() {
    if (!incomingInviteToken) return;
    startTransition(async () => {
      const result = await requestCrewInvitationFromLink(incomingInviteToken).catch(() => null);
      if (!result?.ok) {
        const verified = await readCrewInviteLinkStatus(incomingInviteToken).catch(() => null);
        if (verified === "joined") { setIncomingRequestSent(true); setMessage("You’re connected."); router.refresh(); return; }
      }
      if (!result) { setMessage("We couldn’t confirm the request. Check this invite again."); return; }
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

  const loadMember = useCallback((id: string, preservePosition = false) => {
    pickRequest.current += 1;
    const request = pickRequest.current;
    setSamplePerson(null);
    setOpenMemberId(id);
    setMemberPicksError(false);
    if (!preservePosition) {
      setMemberPicks([]);
      setMemberPicksLoading(true);
    }
    startTransition(async () => {
      const result = await getCrewSharedPicks(id).catch(() => ({ ok: false, picks: [] }));
      if (pickRequest.current !== request) return;
      setMemberPicks(result.ok ? result.picks : []);
      setMemberPicksError(!result.ok);
      setMemberPicksLoading(false);
    });
  }, []);

  function selectMember(id: string) {
    const samePerson = openMemberId === id;
    if (!samePerson) forgetReturn();
    loadMember(id, samePerson);
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

  const activeMember = available ? people.find((person) => person.memberId === openMemberId) : undefined;
  const refreshOpenPicks = useEffectEvent(() => {
    if (!activeMember) {
      pickRequest.current += 1;
      setMemberPicks([]);
      setMemberPicksLoading(false);
      setMemberPicksError(false);
    } else if (activeMember.memberId === selectedMemberId) {
      pickRequest.current += 1;
      setMemberPicks(selectedPicks);
      setMemberPicksLoading(false);
      setMemberPicksError(selectedPicksUnavailable);
    } else {
      loadMember(activeMember.memberId, true);
    }
  });
  const previousPicksRead = useRef({ invitations, selectedPicks, selectedMemberId, selectedPicksUnavailable, available, tab });
  useLayoutEffect(() => {
    const previous = previousPicksRead.current;
    previousPicksRead.current = { invitations, selectedPicks, selectedMemberId, selectedPicksUnavailable, available, tab };
    // AccountStateSync refreshes the route when the tab regains focus.
    if (tab === "crew" && (previous.invitations !== invitations || previous.selectedPicks !== selectedPicks
      || previous.selectedMemberId !== selectedMemberId || previous.selectedPicksUnavailable !== selectedPicksUnavailable || previous.available !== available || previous.tab !== tab)) {
      refreshOpenPicks();
    }
  }, [invitations, selectedPicks, selectedMemberId, selectedPicksUnavailable, available, tab]);
  const visibleMemberPicks = activeMember ? memberPicks : [];
  const activeKey = samplePerson ? `sample-${samplePerson}` : activeMember?.memberId ?? null;
  const missingBookmarkedMember = available && Boolean(bookmarkedMember) && !people.some(person => person.memberId === bookmarkedMember)
    && !samples.some(person => "sample-" + person === bookmarkedMember);
  const readyRewards = overview ? readyWalletRewards(overview.activity) : [];
  const singleReward = !overview?.activity.incomplete && readyRewards.length === 1 ? readyRewards[0] : null;
  const optionsCount = overview?.activity.source === "unavailable" || overview?.activity.incomplete ? null : overview?.activity.activity.filter(item => item.status === "completion").length;

  return <div className={styles.page}>
    <div className={styles.shell}>
      {overview ? <div className={stripStyles.row} aria-label="Your account overview">
        <StatusTicket variant="wallet" size="top" label="Playable Wallet" value={overview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={overview.fundingEnabled ? `${walletHistoryHref}&panel=funding#add-funds` : undefined} actionDisabled={!overview.fundingEnabled} />
        <StatusTicket variant="reward" size="top" label="Prize Ready" value={overview.activity.source === "unavailable" || overview.activity.incomplete ? "Unavailable" : String(readyRewards.length)} action={singleReward ? "View reward" : "View rewards"} href={singleReward ? walletRewardHref(singleReward) : accountRoutes.rewards} />
        <StatusTicket variant="option" size="top" label="Purchase Options" value={optionsCount === null || optionsCount === undefined ? "Unavailable" : String(optionsCount)} action="Continue with Purchase" href={accountRoutes.purchaseOptions} />
      </div> : null}
    {tab === "picks" && <AccountSettingsLandingScroll target="sharing" focusTarget="my-shared-picks-heading" restrictToTargetHash allScreens settleAfterNavigation />}
    {tab === "privacy" && <HelpLandingScroll target="crew-privacy" focusAnchor="crew-privacy" focusOnArrival />}
    <CrewLandingScroll ownerId={currentUserId} groups={initialTab === "groups" && tab === "groups"}
      enabled={initialTab === "groups" && tab === "groups" || initialTab === "crew" && tab === "crew" && !selectedMemberId && !incomingInviteToken} />
    {invalidTab ? <p role="status">That Crew section is unavailable. Showing Your Crew.</p> : null}
    {missingBookmarkedMember ? <AccountSettingsLandingScroll target="crew-member-unavailable" initialTarget="crew-member-unavailable" focusTarget="crew-member-unavailable" allScreens /> : null}
    <header id="crew-intro" className={connectedStyles.heading}>
        <div><h1>Your Crew</h1><p>The people you brought with you.</p><p><span>{connected.length} connected</span>{samples.length ? <span>{samples.length} sample previews</span> : null}</p></div>
        <button ref={headerFinderButton} type="button" aria-expanded={finding} onClick={event => finding ? closeCrewSearch() : openCrewSearch(event, false)}>Add people</button>
      </header>

      {entryReturn ? <Link href={entryReturn}>← Return to this ticket</Link> : null}
      {finderVisit ? <div hidden={!finding}>
        <CrewInlineFinder key={finderVisit} available={available} onSample={name => { selectSample(name); selectTab("crew"); setFinding(false); }} onClose={closeCrewSearch} />
        <details className={connectedStyles.inviteLink}><summary>Invite with your personal link</summary><p>They can join your Crew and leave whenever they like.</p><input ref={inviteField} aria-label="Your Crew invite link" value={inviteUrl} placeholder={ownInviteToken ? "Preparing invite link…" : "Invite link unavailable"} readOnly onFocus={event => event.currentTarget.select()} /><button type="button" onClick={() => void copyInviteLink()} disabled={!ownInviteToken}>Copy invite link</button>{copyMessage ? <p role="status">{copyMessage}</p> : null}</details>
      </div> : null}

      {invalidInvite ? <p role="status">This Crew invite link is incomplete. Ask the sender for a fresh link.</p> : null}
      {incomingInviteToken && incomingInviteToken === ownInviteToken ? <p role="status">This is your personal Crew invite link. Share it with someone you’d like to join.</p> : incomingInviteToken ? <section className={styles.incomingInvite} aria-label="Crew invite request"><div><strong>Someone invited you to connect</strong><p>Join to receive their shared finds. Your own picks stay private until you choose to share back, and you can leave at any time.</p></div><button type="button" disabled={pending || incomingRequestSent} onClick={requestFromInviteLink}>{incomingRequestSent ? "Joined" : "Join Crew"}</button></section> : null}

      {!available ? <p role="alert" className="mt-5 rounded-xl border border-amber-400/45 bg-amber-500/10 p-4 text-sm">Crew sharing is temporarily unavailable. No picks were exposed or changed.</p> : null}
      {message ? <p role="status" className="mt-5 rounded-xl border border-cyan-300/45 bg-[#0c3657] p-4 text-sm">{message}</p> : null}

      <nav id="crew-tabs" tabIndex={-1} className={connectedStyles.navigation} aria-label="Your Crew sections">
        <div className={connectedStyles.mainButtons}>
          <button type="button" data-crew-tab="crew" aria-pressed={tab === "crew"} onClick={() => selectTab("crew")}>Your Crew</button>
          <button type="button" data-crew-tab="groups" aria-pressed={tab === "groups"} onClick={() => selectTab("groups")}>Groups</button>
          <Link href="/account/favorites?tab=shared" data-history-return>Shared with You</Link>
        </div>
        <button type="button" className={connectedStyles.sharingButton} data-crew-tab="picks" aria-pressed={tab === "picks"} onClick={() => selectTab("picks")}>Shared Picks &amp; Cleanup</button>
      </nav>
      {tab === "crew" ? <>
        {missingBookmarkedMember ? <p id="crew-member-unavailable" tabIndex={-1} role="status">This Crew member is unavailable. <Link href="/account/crew#crew-intro" className="underline">Back to your Crew list</Link></p> : null}
        <CrewConnectedGallery bookmarkedPick={activeKey && bookmarkedMember === activeKey ? bookmarkedPick : undefined} ownerId={currentUserId} people={people} samples={samples} selectedKey={activeKey}
          picks={visibleMemberPicks.map(pick => ({ title: pick.title, retailer: pick.retailer, image: pick.image, slug: pick.offeringSlug, note: `${pick.shareKind === "win" ? "Shared win" : "Shared"} ${formatDate(pick.sharedAt, timeZone, locale)}` }))}
          loading={Boolean(activeMember) && memberPicksLoading} error={Boolean(activeMember) && memberPicksError} pending={pending}
          onMember={selectMember} onSample={selectSample} onRetry={() => { if (activeMember) selectMember(activeMember.memberId); }}
          onShareBack={(id, enabled) => run(() => setCrewShareBack(id, enabled))} onRemove={id => run(() => removeCrewConnection(id))} onSampleRemove={name => { removeSampleCrewPreview(name); if (samplePerson === name) setSamplePerson(samples.find(other => other !== name) ?? null); }}
          onShare={event => { shareOpener.current = event.currentTarget; setSharing({ recipientId: event.currentTarget.dataset.crewRecipient }); }} onAdd={openCrewSearch} />
        <section className={connectedStyles.inviteStrip}><div><h2>Good finds are better shared.</h2><p>Bring someone along. Give them a reason to come back.</p></div><button type="button" onClick={openCrewSearch}>Add people +</button></section>
      </> : null}
      {sharing ? <CrewSharePicker onSelect={handOffShare} recipientId={sharing.recipientId} opener={shareOpener} products={[...new Map([...visibleMemberPicks.map(pick => ({ ...pick, slug: pick.offeringSlug })), ...Object.values(samplePicks).flat()].map(pick => [pick.slug, pick])).values()]} onClose={() => setSharing(null)} /> : null}

      <div className={firstStyles.content} hidden={tab !== "groups" && tab !== "privacy"}>
        <CrewDisplaySettings key={currentUserId} ownerId={currentUserId} embedded section={tab === "groups" ? "groups" : "privacy"} available={available && visibilityAvailable} initialDiscoverable={discoverable} initialDiscovery={discovery} initialDefaultRule={visibility?.defaultRule ?? defaultCrewVisibilityRule} initialGroups={visibility?.groups ?? []} initialEntryRules={visibility?.entryRules ?? {}} members={members.map(member => ({ id: member.memberId, name: member.name }))} sharedPicks={entries.filter(entry => entry.shared)} />
      </div>

      {tab === "requests" ? <section className={styles.utilityGrid}>
        <div className={styles.utilityPanel}><h2>Requests for you</h2>{received.length ? <div className={styles.utilityList}>{received.map((item) => <article key={item.id} id={`crew-request-${item.id}`} className={styles.utilityItem}><strong>{item.requester_name} wants to join your Crew</strong><p>Requested {formatDate(item.created_at, timeZone, locale)}. Accepting does not share your existing picks.</p><div className={styles.utilityActions}><button type="button" disabled={pending} onClick={() => run(() => respondToCrewRequest(item.id, true))} className={styles.approveButton}>Approve</button><button type="button" disabled={pending} onClick={() => run(() => respondToCrewRequest(item.id, false))} className={styles.secondaryButton}>Decline</button></div></article>)}</div> : <p className={styles.emptyUtility}>{available ? "No requests waiting for approval." : "Incoming requests are unavailable. Try refreshing."}</p>}</div>
        <div className={styles.utilityPanel}><h2>Requests you sent</h2>{sent.length ? <div className={styles.utilityList}>{sent.map((item) => <article key={item.id} className={styles.utilityItem}><strong>{item.recipient_name}</strong><p>Waiting for approval since {formatDate(item.created_at, timeZone, locale)}.</p><button type="button" disabled={pending} onClick={() => run(() => removeCrewConnection(item.id))} className={styles.cancelButton}>Cancel request</button></article>)}</div> : <p className={styles.emptyUtility}>{available ? "No outgoing requests." : "Outgoing requests are unavailable. Try refreshing."}</p>}</div>
      </section> : null}

      {tab === "picks" ? <CrewSharedPicks ownerId={currentUserId} entries={entries} available={available && visibilityAvailable}
        groups={visibility?.groups ?? []} defaultRule={visibility?.defaultRule ?? defaultCrewVisibilityRule}
        rules={visibility?.entryRules ?? {}} onPrivacy={() => {
          rememberCrewSectionFocus(document.getElementById("crew-sharing-privacy-trigger"));
          selectTab("privacy");
        }} /> : null}
      <p className={firstStyles.footer}>Your entries stay private unless you choose to share them. Your wallet and payment details are never shared with Crew.</p>
    </div>
  </div>;
}
