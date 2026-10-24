import { AccountSettingsNav } from "./AccountSettingsNav";
import { AccountSettingsLandingScroll } from "./AccountSettingsLandingScroll";
import { AccountSettingsStatusStrip, type AccountSettingsOverview } from "./AccountSettingsStatusStrip";
import styles from "./account-security.module.css";

export function AccountSettingsFrame({ active, overview, children }: {
  active: "profile" | "payment" | "sharing";
  overview: AccountSettingsOverview;
  children: React.ReactNode;
}) {
  return <main className={styles.page}>
    <AccountSettingsLandingScroll target="account-settings-sections" visitKey={active} />
    <div className={styles.shell}>
      <AccountSettingsStatusStrip overview={overview} />
      <header id="account-settings-intro" className={styles.heading}><h1>Account &amp; Security</h1><p>Your account. Your control.</p></header>
      <div className={styles.settingsGrid}>
        <AccountSettingsNav active={active} />
        <div className={styles.settingsContent}>{children}</div>
      </div>
    </div>
  </main>;
}
