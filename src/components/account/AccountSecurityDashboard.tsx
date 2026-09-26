import Link from "next/link";
import { AccountIcon } from "./AccountIcon";
import { ChangePasswordControl } from "./ChangePasswordControl";
import { ProfilePhotoCard } from "./ProfilePhotoCard";
import { SignOutEverywhereControl } from "./SignOutEverywhereControl";
import { StatusTicket } from "./StatusTicket";
import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import stripStyles from "./account-status-strip.module.css";
import styles from "./account-security.module.css";

type AccountSecurityDashboardProps = {
  displayName: string;
  initials: string;
  email: string | null;
  emailConfirmed: boolean;
  avatarUrl: string | null;
  memberSince: string | null;
  lastSignInAt: string | null;
  phone: string | null;
  overview?: { balanceLabel: string; fundingEnabled: boolean; activity: AccountActivity };
};

type GlyphName = "lock" | "shield" | "device" | "clock" | "person" | "card" | "key" | "alert" | "check";

function SecurityGlyph({ name }: { name: GlyphName }) {
  const paths = {
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    shield: <><path d="m12 2 8 4v6c0 5-4.2 8.3-8 10-3.8-1.7-8-5-8-10V6l8-4Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    device: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M1.5 21h21M9 17l-1 4m7-4 1 4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    person: <><circle cx="12" cy="8" r="4" /><path d="M4 22a8 8 0 0 1 16 0" /></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
    key: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m11 12 9-9 2 2-2 2 1.5 1.5-2 2L18 9l-2 2" /></>,
    alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 4h.01" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m7.5 12 3 3 6-6" /></>,
  } satisfies Record<GlyphName, React.ReactNode>;
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return { iso: date.toISOString(), label: new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date) };
}

function SecurityDetail({ icon, title, status, children }: { icon: GlyphName; title: string; status: string; children: React.ReactNode }) {
  return <details className={styles.securityDetail}>
    <summary>
      <span className={styles.rowIcon}><SecurityGlyph name={icon} /></span>
      <span className={styles.rowText}><strong>{title}</strong><small>{status}</small></span>
      <AccountIcon name="chevron" className={styles.rowArrow} />
    </summary>
    <div className={styles.detailBody}>{children}</div>
  </details>;
}

export function AccountSecurityDashboard({ displayName, initials, email, emailConfirmed, avatarUrl, memberSince, lastSignInAt, phone, overview }: AccountSecurityDashboardProps) {
  const emailLabel = email ?? "Email not available";
  const signIn = formatDateTime(lastSignInAt);
  const rewards = overview ? readyWalletRewards(overview.activity) : [];
  const singleReward = rewards.length === 1 ? rewards[0] : null;
  const optionCount = overview?.activity.source === "unavailable" ? null : overview?.activity.activity.filter(item => item.status === "completion").length;

  return <main className={styles.page}>
    <div className={styles.shell}>
      {overview ? <div className={stripStyles.row} aria-label="Your account overview">
        <StatusTicket variant="wallet" size="top" label="Playable Wallet" value={overview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={overview.fundingEnabled ? `${walletHistoryHref}#add-funds` : undefined} actionDisabled={!overview.fundingEnabled} />
        <StatusTicket variant="reward" size="top" label="Prize Ready" value={overview.activity.source === "unavailable" ? "Unavailable" : String(rewards.length)} action={singleReward ? "View reward" : "View rewards"} href={singleReward ? walletRewardHref(singleReward) : accountRoutes.rewards} />
        <StatusTicket variant="option" size="top" label="Purchase Options" value={optionCount === null || optionCount === undefined ? "Unavailable" : String(optionCount)} action="Review options" href={accountRoutes.purchaseOptions} />
      </div> : null}

      <header className={styles.heading}>
        <h1>Account &amp; Security</h1>
        <p>Your account. Your control.</p>
      </header>

      <div className={styles.mainGrid}>
        <nav aria-label="Account and security sections" className={styles.sectionNav}>
          <Link href="/account/profile"><span className={styles.navIcon}><SecurityGlyph name="person" /></span><span>Profile</span><AccountIcon name="chevron" /></Link>
          <Link href="/account/security" aria-current="page"><span className={styles.navIcon}><SecurityGlyph name="lock" /></span><span>Sign-in &amp; Security</span><AccountIcon name="chevron" /></Link>
          <Link href="/account/wallet?view=card"><span className={styles.navIcon}><SecurityGlyph name="card" /></span><span>Payment Methods</span><AccountIcon name="chevron" /></Link>
          <Link href="/account/crew?tab=picks#sharing"><span className={styles.navIcon}><AccountIcon name="crew" /></span><span>Sharing Preferences</span><AccountIcon name="chevron" /></Link>
        </nav>

        <section className={styles.mainTicket} aria-labelledby="security-heading" id="security-controls">
          <header className={styles.ticketHeading}>
            <h2 id="security-heading">Sign-in &amp; Security</h2>
            <p>Manage how you sign in and keep your account secure.</p>
          </header>

          <div className={styles.identityRow}>
            <div className={styles.profileSlot}>
              <ProfilePhotoCard initials={initials} fullName={displayName} email={emailLabel} initialAvatarUrl={avatarUrl} compact emailStatus={emailConfirmed ? "verified" : "pending"} />
            </div>
            <div className={styles.verification} data-verified={emailConfirmed}>
              <span><SecurityGlyph name={emailConfirmed ? "shield" : "alert"} /></span>
              <div><strong>{emailConfirmed ? "Email verified" : "Confirmation pending"}</strong><p>{emailConfirmed ? "Your sign-in email is confirmed." : "Confirm your email to complete this step."}</p></div>
            </div>
          </div>

          <div className={styles.securityRows} aria-label="Sign-in and security controls">
            <ChangePasswordControl />
            <SecurityDetail icon="shield" title="Two-step verification" status="Status not available in this preview">
              <p>Two-step verification setup and status are not available here yet. We won’t show it as on without a verified status and recovery flow.</p>
              <Link href="/support">Ask support about account protection <AccountIcon name="arrow" /></Link>
            </SecurityDetail>
            <SecurityDetail icon="key" title="Passkeys" status="Not available yet">
              <p>Passkey registration is not available in this preview. Use the supported sign-in and account-recovery flow for now.</p>
            </SecurityDetail>
            <SecurityDetail icon="device" title="Trusted devices" status="Device list not available">
              <p>This account does not currently provide a verified list of trusted devices. We won’t invent device names or counts.</p>
            </SecurityDetail>
            <SecurityDetail icon="clock" title="Active sessions" status="Session list not available">
              <p>Individual active sessions cannot be reviewed here yet. {signIn ? <>The latest recorded sign-in was <time dateTime={signIn.iso}>{signIn.label}</time>.</> : "No sign-in timestamp is available."}</p>
              <a href="#sign-out-everywhere">Need to secure your account? Review sign-out options <AccountIcon name="arrow" /></a>
            </SecurityDetail>
          </div>
        </section>

        <aside className={styles.aside} aria-label="Security actions">
          <section className={styles.checkupTicket} aria-labelledby="checkup-heading">
            <h2 id="checkup-heading">Security checkup</h2>
            <p>What we can verify for your account.</p>
            <ul>
              <li><SecurityGlyph name={emailConfirmed ? "check" : "alert"} /><span>Email {emailConfirmed ? "is verified" : "confirmation pending"}</span></li>
              <li><SecurityGlyph name="key" /><span>Password strength is not recorded</span></li>
              <li><SecurityGlyph name="shield" /><span>Two-step verification status is not available</span></li>
            </ul>
            <a href="#security-controls" className={styles.checkupLink}>Review security <AccountIcon name="arrow" /></a>
          </section>
          <section className={styles.signOutTicket} id="sign-out-everywhere" aria-labelledby="signout-heading">
            <span className={styles.signOutIcon}><SecurityGlyph name="alert" /></span>
            <div><h2 id="signout-heading">Sign out everywhere</h2><p>Revoke sign-in sessions on this and other devices.</p></div>
            <SignOutEverywhereControl />
          </section>
        </aside>
      </div>

      <div className={styles.lowerGrid}>
        <section className={styles.lowerTicket} aria-labelledby="recent-signins-heading">
          <header><h2 id="recent-signins-heading">Recent sign-ins</h2><Link href="/account/notifications">View account updates <AccountIcon name="arrow" /></Link></header>
          {signIn ? <div className={styles.signInFacts}><time dateTime={signIn.iso}>{signIn.label}</time><span>Device: Not recorded</span><span>Location: Not recorded</span></div> : <p>Sign-in history is not available from this account yet.</p>}
        </section>
        <section className={styles.lowerTicket} aria-labelledby="personal-info-heading">
          <header><h2 id="personal-info-heading">Personal information</h2><Link href="/account/profile">Edit profile <AccountIcon name="arrow" /></Link></header>
          <dl><div><dt>Name</dt><dd>{displayName}</dd></div><div><dt>Email</dt><dd>{emailLabel}</dd></div><div><dt>Phone</dt><dd>{phone ?? "Not added"}</dd></div><div><dt>Member since</dt><dd>{formatDate(memberSince)}</dd></div></dl>
        </section>
        <section className={styles.lowerTicket} aria-labelledby="crew-heading">
          <header><h2 id="crew-heading">Crew &amp; sharing</h2><Link href="/account/crew?tab=picks#sharing">Manage sharing <AccountIcon name="arrow" /></Link></header>
          <p>Approve connections and choose which entries your Crew can see. Sharing is private by default.</p>
        </section>
      </div>
    </div>
  </main>;
}
