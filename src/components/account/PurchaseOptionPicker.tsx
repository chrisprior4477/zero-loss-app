import { useState, type ReactNode } from "react";

export function PurchaseOptionPicker<Id extends string | number>({ optionIds, selected, styles, onApply, onDecline, children }: {
  optionIds: Id[];
  selected: Id[];
  styles: Record<string, string>;
  onApply: (ids: Id[]) => void;
  onDecline?: (ids: Id[]) => void;
  children?: (draft: Id[]) => ReactNode;
}) {
  // The dialog owns these edits until Apply. Dismissing it unmounts the draft.
  const [draft, setDraft] = useState(selected);
  const picked = draft.filter(id => optionIds.includes(id));

  function toggle(id: Id) {
    setDraft(current => {
      if (!current.includes(id)) return [...current, id];
      return current.length > 1 ? current.filter(value => value !== id) : current;
    });
  }

  return <>
    <div className={styles.exact}>{optionIds.map((id, index) =>
      <button key={id} type="button" aria-label={`Option ${index + 1}`} aria-pressed={draft.includes(id)}
        className={`${styles.ticket} ${styles.option}`} onClick={() => toggle(id)}>
        <small>OPTION</small>{index + 1}
      </button>
    )}</div>
    <button type="button" className={styles.primary} disabled={!picked.length} onClick={() => onApply(picked)}>Use these options</button>
    {onDecline && <button type="button" className={styles.declineSelected} disabled={!picked.length} onClick={() => onDecline(picked)}>Decline selected ({picked.length})</button>}
    {children?.(picked)}
  </>;
}
