import Link from "next/link";
import type { ReactNode, Ref } from "react";
import styles from "./insufficient-funds.module.css";

/** Shared low-balance treatment; the destination still verifies the latest ledger. */
export function InsufficientFundsNotice({ children, href, onAddFunds, linkRef }: {
  children: ReactNode;
  href?: string;
  onAddFunds?: () => void;
  linkRef?: Ref<HTMLAnchorElement>;
}) {
  return <div role="status" className={styles.notice}>
    <strong className={styles.title}>Not enough funds</strong>
    <div className={styles.copy}>{children}</div>
    {href ? <Link ref={linkRef} href={href} onClick={onAddFunds} data-funding-action="true" className={styles.action}>Add funds</Link> : null}
  </div>;
}
