import styles from "./entry-undo-countdown.module.css";

export function EntryUndoCountdown({ seconds, compact = false }: { seconds: number; compact?: boolean }) {
  return (
    <div className={`${styles.badge}${compact ? ` ${styles.compact}` : ""}`} role="timer" aria-label={`${seconds} seconds left to undo`}>
      <span className={styles.number} aria-hidden="true">{seconds}</span>
      <span className={styles.unit} aria-hidden="true">sec</span>
    </div>
  );
}
