import { AccountSettingsNav } from "./AccountSettingsNav";
import { AccountSettingsStatusStrip, type AccountSettingsOverview } from "./AccountSettingsStatusStrip";
import styles from "./account-security.module.css";

export function AccountSettingsFrame({ active, overview, children }: {
  active: "profile" | "payment";
  overview: AccountSettingsOverview;
  children: React.ReactNode;
}) {
  return <main className={styles.page}>
    <div className={styles.shell}>
      <AccountSettingsStatusStrip overview={overview} />
      <header className={styles.heading}><h1>Account &amp; Security</h1><p>Your account. Your control.</p></header>
      <div className={styles.settingsGrid}>
        <AccountSettingsNav active={active} />
        <div className={styles.settingsContent}>{children}</div>
      </div>
    </div>
  </main>;
}
