"use client";

import { Activity, Component, useLayoutEffect, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "./account-settings-pages.module.css";
import { revealBelowHeader } from "@/lib/account/landing-position";

const profileSectionIds = new Set(["personal-details-heading", "contact-details-heading", "mailing-address-heading", "profile-preferences-heading", "personalize-menu-heading", "personalize-logo-heading"]);

function ProfileSectionLanding({ unavailable = false }: { unavailable?: boolean }) {
  useLayoutEffect(() => {
    function land() {
      const section = window.location.hash.slice(1);
      if (!profileSectionIds.has(section)) return;
      const target = document.getElementById(unavailable ? "profile-read-unavailable" : section);
      if (!target?.getClientRects().length) return;
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
      revealBelowHeader(target);
    }
    const frame = requestAnimationFrame(land);
    window.addEventListener("hashchange", land);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", land); };
  }, [unavailable]);
  return null;
}

// A background refresh can fail while someone is typing. Keep the last verified
// editors mounted but hidden so retrying also restores their unsaved draft.
export class ProfileReadBoundary extends Component<{ children: ReactNode }, { editors: ReactNode }> {
  state: { editors: ReactNode } = { editors: null };

  static getDerivedStateFromProps({ children }: { children: ReactNode }) {
    return children == null ? null : { editors: children };
  }

  render() {
    const unavailable = this.props.children == null;
    return <>
      {unavailable && <ProfileUnavailable />}
      <Activity mode={unavailable ? "hidden" : "visible"}><ProfileSectionLanding />{this.state.editors}</Activity>
    </>;
  }
}

function ProfileUnavailable() {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();
  return <section id="profile-intro" className={styles.introTicket} aria-labelledby="profile-heading">
    <ProfileSectionLanding unavailable />
    <div>
      <span className={styles.eyebrow}>PERSONAL PROFILE</span>
      <h2 id="profile-heading">Profile</h2>
    </div>
    <div>
      <h3 id="profile-read-unavailable" tabIndex={-1} className="font-bold">We couldn’t load your profile.</h3>
      <p>Try again to see and edit your saved details.</p>
      <button type="button" className="mt-3 min-h-11 rounded-lg bg-[#0065d9] px-5 font-bold text-white" disabled={retrying}
        onClick={() => startTransition(() => router.refresh())}>{retrying ? "Trying again…" : "Try again"}</button>
    </div>
  </section>;
}
