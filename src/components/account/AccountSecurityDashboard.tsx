import Image from "next/image";
import Link from "next/link";
import { AccountIcon } from "./AccountIcon";
import { ProfilePhotoCard } from "./ProfilePhotoCard";
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
};

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
  return {
    dateTime: date.toISOString(),
    date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date),
  };
}

function SecurityGlyph({ name }: { name: "lock" | "shield" | "device" | "clock" | "person" }) {
  const paths = {
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    shield: <><path d="m12 2 8 4v6c0 5-4.2 8.3-8 10-3.8-1.7-8-5-8-10V6l8-4Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    device: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M1.5 20h21M9 16l-1 4m7-4 1 4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    person: <><circle cx="12" cy="8" r="4" /><path d="M4 22a8 8 0 0 1 16 0" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function UnavailableAction({ children }: { children: React.ReactNode }) {
  return <button type="button" disabled title="This security control is not enabled in the preview">{children}<AccountIcon name="arrow" /></button>;
}

export function AccountSecurityDashboard({
  displayName,
  initials,
  email,
  emailConfirmed,
  avatarUrl,
  memberSince,
  lastSignInAt,
  phone,
}: AccountSecurityDashboardProps) {
  const signIn = formatDateTime(lastSignInAt);
  const emailLabel = email ?? "Email not available";

  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.heading}>
        <p>Your account</p>
        <h1>Account &amp; Security</h1>
        <span>Your identity, sign-in, and protection settings.</span>
      </header>

      <section className={styles.profileHero} aria-label="Account identity">
        <div className={styles.profileSlot}>
          <ProfilePhotoCard initials={initials} fullName={displayName} email={emailLabel} initialAvatarUrl={avatarUrl} compact emailStatus={emailConfirmed ? "verified" : "pending"} />
        </div>
        <dl className={styles.accountFacts}>
          <div><dt>Member since</dt><dd>{formatDate(memberSince)}</dd></div>
          <div><dt>Account status</dt><dd className={emailConfirmed ? styles.active : styles.pending}><span aria-hidden="true" />{emailConfirmed ? "Active" : "Confirmation pending"}</dd><p>{emailConfirmed ? "Your account is in good standing." : "Confirm your email to finish securing your account."}</p></div>
        </dl>
        <Image className={styles.shieldArt} src="/account/security-shield-hero-v1.png" alt="" width={1304} height={1206} priority sizes="(max-width: 800px) 0px, 330px" />
      </section>

      <section className={styles.securityCards} aria-label="Security controls">
        <article className={styles.controlCard}>
          <span className={styles.cardIcon}><SecurityGlyph name="lock" /></span>
          <div><h2>Password</h2><p>Keep your account secure with a strong, unique password.</p><small>Not enabled in this preview</small></div>
          <UnavailableAction>Change password</UnavailableAction>
        </article>
        <article className={styles.controlCard}>
          <span className={styles.cardIcon}><SecurityGlyph name="shield" /></span>
          <div><h2>Two-step verification</h2><p>Add an extra layer of protection to your account.</p><small>Not enabled in this preview</small></div>
          <UnavailableAction>Set up</UnavailableAction>
        </article>
        <article className={`${styles.controlCard} ${styles.devicesCard}`}>
          <span className={styles.cardIcon}><SecurityGlyph name="device" /></span>
          <div><h2>Trusted devices</h2><p>Device history is not available for this account yet.</p><small>No device details are being inferred</small></div>
          <UnavailableAction>Manage devices</UnavailableAction>
        </article>
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.signIns}>
          <header><span className={styles.cardIcon}><SecurityGlyph name="clock" /></span><h2>Recent sign-ins</h2><Link href="/account/notifications">View account updates <AccountIcon name="arrow" /></Link></header>
          {signIn ? <div className={styles.signInTable} role="table" aria-label="Recent sign-ins">
            <div className={styles.tableHeader} role="row"><span role="columnheader">Date &amp; time</span><span role="columnheader">Device</span><span role="columnheader">Location</span><span role="columnheader">Status</span></div>
            <div className={styles.tableRow} role="row"><span role="cell"><time dateTime={signIn.dateTime}>{signIn.date}<b>{signIn.time}</b></time></span><span role="cell">Not recorded</span><span role="cell">Not recorded</span><strong role="cell">Latest</strong></div>
          </div> : <div className={styles.noSignIns}><p>Sign-in history is not available from this account yet.</p><span>We’ll show confirmed activity here when it is recorded.</span></div>}
        </article>

        <article className={styles.personalInfo}>
          <header><span className={styles.cardIcon}><SecurityGlyph name="person" /></span><div><h2>Personal information</h2><p>Manage your name and contact details.</p></div></header>
          <dl>
            <div><dt>Name</dt><dd>{displayName}</dd></div>
            <div><dt>Email</dt><dd>{emailLabel} <span className={styles.inlineStatus}>{emailConfirmed ? "✓ Verified" : "Confirmation pending"}</span></dd></div>
            <div><dt>Phone</dt><dd>{phone ?? "Not added"}</dd></div>
          </dl>
          <Link href="/account/profile">Edit profile <AccountIcon name="arrow" /></Link>
        </article>
      </section>
    </div>
  </main>;
}
