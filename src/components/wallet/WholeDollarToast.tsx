"use client";

import { useId } from "react";
import { FundingNoticeDialog } from "./FundingNoticeDialog";
import styles from "./whole-dollar-toast.module.css";

export function WholeDollarToast({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const description = useId();

  return <FundingNoticeDialog label="Whole-dollar deposit notice" description={description}
    closeLabel="Close whole-dollar notice" onClose={onClose} revealTrigger>
    <div id={description}>
      <h2>Only whole dollar amounts are accepted for deposits.</h2>
      <p>Choose an amount like $25 or $50, without cents. Your amount won’t be rounded or changed.</p>
    </div>
    <button type="button" className={styles.save} onClick={onSave}>I understand and save</button>
  </FundingNoticeDialog>;
}
