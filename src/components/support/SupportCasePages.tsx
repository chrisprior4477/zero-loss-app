"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { safeTimeZone } from "@/lib/account/timezone";
import styles from "@/components/help/help-tickets.module.css";

export type SupportCaseListItem = {
  id: string; case_number: string; subject: string; status: string; label?: string; lastReply?: string;
};

export function SupportCaseList({ cases, context, timeZone }: { cases: SupportCaseListItem[]; context: string; timeZone: string }) {
  const date = new Intl.DateTimeFormat("en-US", { timeZone: safeTimeZone(timeZone), dateStyle: "medium" });
  return <ul className="mt-3 space-y-3">
    {cases.map(item => <li key={item.id}>
      <Link href={`/support?case=${item.id}${context}#conversation`} className={`${styles.ticket} ${styles.caseLink}`}>
        <span className={styles.caseDetails}>
          <strong>{item.subject}</strong>
          <span className={`text-sm ${styles.eyebrow}`}>{item.lastReply && Number.isFinite(Date.parse(item.lastReply))
            ? <>Last Support reply <time dateTime={item.lastReply}>{date.format(new Date(item.lastReply))}</time></>
            : item.label}</span>
          <span className={`text-xs ${styles.muted}`}>{item.case_number}</span>
        </span>
        <span className={styles.caseAction}>Open case</span>
      </Link>
    </li>)}
  </ul>;
}

export function SupportCasePages({ cases, timeZone, initialPage, pageSize, base }: {
  cases: SupportCaseListItem[]; timeZone: string; initialPage: number; pageSize: number; base: string;
}) {
  // Keep the current ordering even when a background account refresh brings in a reply.
  const [snapshot] = useState(cases);
  const last = Math.max(0, Math.ceil(snapshot.length / pageSize) - 1);
  const [page, setPage] = useState(Math.min(initialPage, last));
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const restorePage = () => {
      const query = new URLSearchParams(window.location.search);
      if (window.location.pathname !== "/support" || query.has("case")) return;
      const requested = query.get("page");
      setPage(requested && /^\d{1,5}$/.test(requested) ? Math.max(0, Math.min(Number(requested) - 1, last)) : 0);
    };
    window.addEventListener("popstate", restorePage);
    return () => window.removeEventListener("popstate", restorePage);
  }, [last]);
  function href(index: number) {
    const url = new URL(base, "https://navigation.invalid");
    if (index) url.searchParams.set("page", String(index + 1));
    return `${url.pathname}${url.search}#case-list`;
  }
  function go(index: number) {
    window.history.pushState(null, "", href(index));
    setPage(index);
    const target = heading.current?.closest<HTMLElement>("#case-list");
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: "start" });
  }
  const current = snapshot.slice(page * pageSize, (page + 1) * pageSize);
  const waiting = current.filter(item => item.status === "awaiting_customer");
  const other = current.filter(item => item.status !== "awaiting_customer");
  const context = page ? `&page=${page + 1}` : "";
  return <div ref={heading}>
    {!current.length ? <p className={`mt-4 ${styles.muted}`}>No cases yet.</p> : null}
    {waiting.length > 0 ? <section aria-labelledby="support-waiting-heading" className="mt-4">
      <h3 id="support-waiting-heading" className={`font-bold ${styles.eyebrow}`}>Waiting for you</h3>
      <SupportCaseList cases={waiting} context={context} timeZone={timeZone} />
    </section> : null}
    {other.length > 0 ? <div className="mt-4">
      {waiting.length ? <h3 className="font-bold">Other cases</h3> : null}
      <SupportCaseList cases={other} context={context} timeZone={timeZone} />
    </div> : null}
    {snapshot.length > pageSize ? <nav aria-label="Case pages" className={styles.pagination}>
      {page > 0 ? <Link href={href(page - 1)} onNavigate={event => { event.preventDefault(); go(page - 1); }}>← Newer cases</Link> : null}
      <span role="status">Page {page + 1}</span>
      {page < last ? <Link href={href(page + 1)} onNavigate={event => { event.preventDefault(); go(page + 1); }}>Older cases →</Link> : null}
    </nav> : null}
    <a className="mt-3 inline-block font-bold text-cyan-200 underline" href={href(0)}>Load latest cases</a>
  </div>;
}
