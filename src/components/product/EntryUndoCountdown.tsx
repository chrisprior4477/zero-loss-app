import styles from "./entry-undo-countdown.module.css";

export function EntryUndoCountdown({ seconds, compact = false, action = "undo" }: { seconds: number; compact?: boolean; action?: string }) {
  return (
    <div className={`${styles.badge}${compact ? ` ${styles.compact}` : ""}`} role="timer" aria-label={`${seconds} seconds left to ${action}`}>
      <span className={styles.number} aria-hidden="true">{seconds}</span>
      <span className={styles.unit} aria-hidden="true">sec</span>
    </div>
  );
}
