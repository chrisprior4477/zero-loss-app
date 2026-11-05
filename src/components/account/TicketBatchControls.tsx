import styles from "./ticket-batches.module.css";

export function TicketBatchControls({ remaining, expanded, more, previousPage, close, listId, noun, top = false }: {
  remaining: number; expanded: boolean; more: () => void; previousPage?: () => void; close: () => void; listId: string; noun: string; top?: boolean;
}) {
  if (top ? !expanded : !remaining && !expanded) return null;
  return <div className={styles.actions}>
    {!top && expanded && previousPage && <button type="button" className={styles.previous} aria-controls={listId} onClick={previousPage}>Previous</button>}
    {!top && remaining > 0 && <button type="button" aria-controls={listId} aria-expanded={expanded} onClick={more}>See more {noun} ({remaining} remaining)</button>}
    {expanded && <button type="button" aria-controls={listId} aria-expanded={expanded} className={styles.close} onClick={close}>Close</button>}
  </div>;
}
