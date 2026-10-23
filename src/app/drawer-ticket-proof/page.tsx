import { notFound } from "next/navigation";
import Link from "next/link";
import { StatusTicket } from "@/components/account/StatusTicket";
import { MenuTicket } from "@/components/account/MenuTicket";
import { AccountIcon } from "@/components/account/AccountIcon";
import { signOutAction } from "@/lib/auth/actions";
import { DrawerProofInstallButton } from "./DrawerProofInstallButton";
import styles from "./drawer-top-proof.module.css";

/** Local visual fixture only. The real drawer keeps its live values and behavior. */
export default function DrawerTicketProofPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <div className={styles.stage}>
      <style>{"nextjs-portal { display: none !important; }"}</style>
      <div className={styles.panel}>
        <div className={styles.header}>
          <Link href="/account/profile" className={styles.profile} aria-label="Open Chris Prior's account">
            <span className={styles.avatar} aria-hidden="true">CP</span>
            <span className={styles.profileText}><strong>Chris Prior</strong><small>Your account</small></span>
          </Link>
          <div className={styles.headerActions}>
            <Link href="/account/entries?filter=active" className={styles.counter} aria-label="8 active entries">
              <svg viewBox="0 0 54 36" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 3h48v9a6 6 0 0 0 0 12v9H3v-9a6 6 0 0 0 0-12V3Z" />
                <circle cx="27" cy="18" r="7" />
                <path d="m21.5 24 11-12" strokeLinecap="round" />
              </svg>
              <span>8</span>
            </Link>
            <Link href="/account/notifications" className={styles.notifications} aria-label="Notifications">
              <AccountIcon name="bell" />
            </Link>
            <Link href="/" className={styles.close} aria-label="Close visual proof">
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M7 7 25 25M25 7 7 25" /></svg>
            </Link>
          </div>
        </div>
        <div className={styles.tickets} aria-label="Account status ticket visual proof">
          <StatusTicket variant="wallet" label="Playable Wallet" value="$193" action="Add funds" href="/account/wallet?view=history#add-funds" />
          <StatusTicket variant="reward" label="Prize Ready" value="1" action="View reward" href="/account/wallet" />
          <StatusTicket variant="option" label="Purchase Options" value="0" action="Review options" href="/account/entries?filter=completion" />
        </div>
        <nav className={styles.firstNavigation} aria-label="Account navigation ticket visual proof">
          <MenuTicket title="My Activity" description="Track your entries and results." href="/account/entries" imageSrc="/account/drawer/my-activity-324x180.png" />
          <MenuTicket title="Gift Cards & Rewards" description="Browse prizes and claim rewards." href="/account/wallet" imageSrc="/account/drawer/gift-cards-rewards-324x180.png" />
          <MenuTicket title="Wallet & Transactions" description="Manage your balance and view transactions." href="/account/wallet?view=history" imageSrc="/account/drawer/wallet-transactions-324x180.png" artworkTreatment="fit-wallet" />
          <MenuTicket title="Orders & Fulfillment" description="Track your orders and delivery updates." href="/account/orders" imageSrc="/account/drawer/orders-fulfillment-324x180.png" artworkTreatment="fill-panel" />
          <MenuTicket title="Your Crew" description="Build your crew and see their activity." href="/account/crew" imageSrc="/account/drawer/your-crew-exact-324x180.png" artworkTreatment="fill-panel" />
          <MenuTicket title="Notifications" description="The updates that need your attention." href="/account/notifications" imageSrc="/account/drawer/notifications-exact-324x180.png" artworkTreatment="full" />
          <MenuTicket title="Account & Security" description="Profile, preferences, and security settings." href="/account/security" imageSrc="/account/drawer/account-security-324x180.png" />
        </nav>
        <div className={styles.promoWrap}>
          <div className={styles.promo}>
            <span className={styles.promoIcon} aria-hidden="true"><span className={styles.promoMark} /></span>
            <strong>Real prizes. Real possibilities.</strong>
          </div>
        </div>
        <div className={styles.utilityWrap}><DrawerProofInstallButton /></div>
        <form action={signOutAction} className={styles.footer}>
          <button type="submit" className={styles.signOutButton}><AccountIcon name="signout" /><span>Sign out</span></button>
        </form>
      </div>
    </div>
  );
}
