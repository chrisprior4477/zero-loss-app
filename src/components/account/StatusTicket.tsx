import Link from "next/link";
import styles from "./status-ticket.module.css";

type StatusTicketProps = {
  label: string;
  value: string;
  action: string;
  href: string;
  variant: "wallet" | "reward" | "option";
  actionHref?: string;
  actionDisabled?: boolean;
  onNavigate?: () => void;
  ariaLabel?: string;
  valueTestId?: string;
  tooltip?: string;
  size?: "default" | "overview" | "crew";
};

/** The approved ticket shape, with separate wallet actions when funding is unavailable. */
export function StatusTicket({ label, value, action, href, variant, actionHref, actionDisabled = false, onNavigate, ariaLabel, valueTestId, tooltip, size = "default" }: StatusTicketProps) {
  const information = (
    <>
        <span className={styles.iconPanel} aria-hidden="true">
          {variant === "wallet" ? (
            <svg className={styles.statusIcon} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 12V8.5A3.5 3.5 0 0 1 14.5 5h21a3.5 3.5 0 0 1 3.5 3.5V14" />
              <path d="M10 12h29a2 2 0 0 1 2 2v24a3 3 0 0 1-3 3H11a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4Z" />
              <path d="M41 22h-9a3 3 0 0 0-3 3v5a3 3 0 0 0 3 3h9" />
              <circle cx="34" cy="27.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          ) : variant === "reward" ? (
            <svg className={styles.statusIcon} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 20h34v8H7zM10 28v15h28V28M24 20v23" />
              <path d="M23 19c-10 0-14-3-14-8a5 5 0 0 1 5-5c5 0 8 7 10 13Zm2 0c10 0 14-3 14-8a5 5 0 0 0-5-5c-5 0-8 7-10 13Z" />
            </svg>
          ) : (
            <svg className={styles.statusIcon} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="24" cy="24" r="17" />
              <path d="m15 24 6 6 12-13" />
            </svg>
          )}
        </span>
        <span className={styles.copy}>
          <span className={styles.label}>{label}</span>
          <strong className={styles.value} data-testid={valueTestId} data-unavailable={value === "Unavailable" || undefined}>{value}</strong>
        </span>
    </>
  );
  const arrow = (
    <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15h20m-8-8 8 8-8 8" />
    </svg>
  );
  const className = `${styles.ticket} ${styles[variant]}`;

  if (variant === "wallet" && (actionHref || actionDisabled)) {
    return (
      <article className={className} aria-label={label} data-size={size}>
        <Link href={href} onClick={onNavigate} className={styles.information} aria-label={`${label}: ${value}`}>
          {information}
        </Link>
        <span className={styles.perforation} aria-hidden="true" />
        {actionDisabled ? (
          <button type="button" disabled title="Funding is not available" className={`${styles.action} ${styles.disabledAction}`}><span>{action}</span>{arrow}</button>
        ) : (
          <Link href={actionHref!} onClick={onNavigate} className={styles.action}><span>{action}</span>{arrow}</Link>
        )}
      </article>
    );
  }

  return (
    <Link className={className} href={href} onClick={onNavigate} title={tooltip} aria-label={ariaLabel ?? `${label}: ${value}. ${action}`} data-size={size}>
      <span className={styles.information}>{information}</span>
      <span className={styles.perforation} aria-hidden="true" />
      <span className={styles.action}>
        <span>{action}</span>
        {arrow}
      </span>
    </Link>
  );
}
