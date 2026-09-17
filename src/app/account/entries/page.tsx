import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MyZeroLossActivity } from "@/components/account/MyZeroLossActivity";
import { getAccountContext } from "@/lib/account/context";
import { activityFilter } from "@/lib/account/activity";
import styles from "@/components/account/showroom.module.css";

export const metadata: Metadata = { title: "My Zero Loss" };

export default async function MyZeroLossPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await getAccountContext();
  if (!account) redirect("/login");
  const query = await searchParams;
  return <div className={styles.page}><div className={styles.pageContent}>
    <Link href="/account" className={styles.breadcrumb}>‹ Account Dashboard</Link>
    <p className={styles.eyebrow}>MY ZERO LOSS</p>
    <h1 className={styles.heading}>Everything you chose. Every outcome.</h1>
    <p className={styles.subtitle}>Track your entries, see results, and take the next step.</p>
    <MyZeroLossActivity state={account.activity} filter={activityFilter(query.filter)} selectedSlug={typeof query.item === "string" ? query.item : undefined} />
    <p className={styles.footerNote}>REAL PRODUCTS. REAL PROGRESS.</p>
  </div></div>;
}
