import Link from "next/link";
import { AccountIcon } from "./AccountIcon";
import styles from "./account-security.module.css";

type GlyphName = "lock" | "shield" | "device" | "clock" | "person" | "card" | "key" | "alert" | "check";

export function SecurityGlyph({ name }: { name: GlyphName }) {
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

export function AccountSettingsNav({ active }: { active: "profile" | "security" | "payment" | "sharing" }) {
  return <nav aria-label="Account and security sections" className={styles.sectionNav}>
    <Link href="/account/profile" aria-current={active === "profile" ? "page" : undefined}><span className={styles.navIcon}><SecurityGlyph name="person" /></span><span>Profile</span><AccountIcon name="chevron" /></Link>
    <Link href="/account/security" aria-current={active === "security" ? "page" : undefined}><span className={styles.navIcon}><SecurityGlyph name="lock" /></span><span>Sign-in &amp; Security</span><AccountIcon name="chevron" /></Link>
    <Link href="/account/payment-methods" aria-current={active === "payment" ? "page" : undefined}><span className={styles.navIcon}><SecurityGlyph name="card" /></span><span>Payment Methods</span><AccountIcon name="chevron" /></Link>
    <Link href="/account/crew/display" aria-current={active === "sharing" ? "page" : undefined}><span className={styles.navIcon}><AccountIcon name="crew" /></span><span>Sharing Preferences</span><AccountIcon name="chevron" /></Link>
  </nav>;
}
