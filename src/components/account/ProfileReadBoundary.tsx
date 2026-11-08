"use client";

import { Activity, Component, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "./account-settings-pages.module.css";

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
      <Activity mode={unavailable ? "hidden" : "visible"}>{this.state.editors}</Activity>
    </>;
  }
}

function ProfileUnavailable() {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();
  return <section id="profile-intro" className={styles.introTicket} aria-labelledby="profile-heading">
    <div>
      <span className={styles.eyebrow}>PERSONAL PROFILE</span>
      <h2 id="profile-heading">Profile</h2>
    </div>
    <div>
      <h3 className="font-bold">We couldn’t load your profile.</h3>
      <p>Try again to see and edit your saved details.</p>
      <button type="button" className="mt-3 min-h-11 rounded-lg bg-[#0065d9] px-5 font-bold text-white" disabled={retrying}
        onClick={() => startTransition(() => router.refresh())}>{retrying ? "Trying again…" : "Try again"}</button>
    </div>
  </section>;
}
