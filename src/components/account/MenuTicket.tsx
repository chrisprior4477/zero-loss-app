import Image from "next/image";
import Link from "next/link";
import styles from "./menu-ticket.module.css";

type MenuTicketProps = {
  title: string;
  description: string;
  href: string;
  imageSrc: string;
  artworkTreatment?: "zoom" | "full" | "fit-wallet" | "fill-panel";
  onNavigate?: () => void;
  active?: boolean;
};

/** Illustrated navigation ticket shared by the proof and the functional drawer. */
export function MenuTicket({ title, description, href, imageSrc, artworkTreatment = "zoom", onNavigate, active = false }: MenuTicketProps) {
  return (
    <span className={styles.shadow}>
      <Link href={href} onClick={onNavigate} className={styles.ticket} aria-label={title} aria-current={active ? "page" : undefined}>
        <span className={styles.artworkFrame} data-treatment={artworkTreatment}><Image src={imageSrc} alt="" width={108} height={60} unoptimized className={styles.artwork} /></span>
        <span className={styles.perforation} aria-hidden="true" />
        <span className={styles.copy}>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 4 8 8-8 8" /></svg>
      </Link>
    </span>
  );
}
