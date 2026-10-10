"use client";

import { useState } from "react";
import styles from "./entry-page.module.css";

export function PrizeNumberCopy({ number }: { number: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(number);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return <dd className={styles.entryNumber}>
    <span className={styles.prizeNumberRow}>
      <span>{number}</span>
      <button
        type="button"
        className={styles.prizeCopyButton}
        onClick={copyNumber}
        aria-label={`${status === "copied" ? "Copied" : "Copy"} prize number ${number}`}
        title={status === "error" ? "Could not copy. Please try again." : `Copy prize number ${number}`}
      >
        {status === "copied" ? <span aria-hidden="true">✓</span> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>}
        <span>{status === "copied" ? "Copied" : status === "error" ? "Try again" : "Copy"}</span>
      </button>
    </span>
  </dd>;
}
