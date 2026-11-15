import Link from "next/link";
import type { ReactNode, Ref } from "react";
import styles from "./insufficient-funds.module.css";

/** Shared low-balance treatment; the destination still verifies the latest ledger. */
export function InsufficientFundsNotice({ children, href, onAddFunds, linkRef, onTicket = false }: {
  children: ReactNode;
  href?: string;
  onAddFunds?: () => void;
  linkRef?: Ref<HTMLAnchorElement>;
  onTicket?: boolean;
}) {
  return <div role="status" className={onTicket ? `${styles.notice} ${styles.onTicket}` : styles.notice}>
    <strong className={styles.title}>Not enough funds</strong>
    <div className={styles.copy}>{children}</div>
    {href ? <Link ref={linkRef} href={href} onClick={onAddFunds} data-funding-action="true" className={styles.action}>Add funds</Link> : null}
  </div>;
}
