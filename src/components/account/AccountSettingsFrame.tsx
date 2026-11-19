import { accountLanguage } from "@/lib/account/locale";
import { AccountSettingsNav } from "./AccountSettingsNav";
import { AccountSettingsLandingScroll } from "./AccountSettingsLandingScroll";
import { AccountSettingsStatusStrip, type AccountSettingsOverview } from "./AccountSettingsStatusStrip";
import styles from "./account-security.module.css";

export function AccountSettingsFrame({ active, overview, children, locale }: {
  active: "profile" | "payment" | "sharing";
  overview: AccountSettingsOverview;
  children: React.ReactNode;
  locale?: string | null;
}) {
  const t = accountLanguage(locale);
  return <div className={styles.page} data-settings-scroll-scope>
    <AccountSettingsLandingScroll target="account-settings-sections" visitKey={active} />
    <div className={styles.shell}>
      <AccountSettingsStatusStrip overview={overview} />
      <header id="account-settings-intro" className={styles.heading}><h1>{t("Account & Security", "Cuenta y seguridad")}</h1><p>{t("Your account. Your control.", "Tú controlas tu cuenta.")}</p></header>
      <div className={styles.settingsGrid}>
        <AccountSettingsNav active={active} locale={locale} />
        <div className={styles.settingsContent}>{children}</div>
      </div>
    </div>
  </div>;
}
