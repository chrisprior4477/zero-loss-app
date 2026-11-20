import type { AccountNotification } from "@/lib/account/notifications";

export function supportNotifications(rows: unknown, timeZone = "America/New_York", replies: unknown = [], include: (date: string) => boolean = () => true): AccountNotification[] {
  if (!Array.isArray(rows)) return [];
  const latestReply = new Map<string, { id: string; status: string; created_at: string }>();
  if (Array.isArray(replies)) for (const reply of replies) {
    if (typeof reply?.case_id === "string" && typeof reply.id === "string"
      && /^[0-9a-f-]{36}$/i.test(reply.id) && Number.isFinite(Date.parse(reply.created_at))
      && !latestReply.has(reply.case_id)) latestReply.set(reply.case_id, reply);
  }
  return rows.flatMap((r): AccountNotification[] => {
    if (!r || typeof r.id !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(r.id) || typeof r.subject !== "string" || typeof r.updated_at !== "string" ||
      !Number.isFinite(Date.parse(r.updated_at)) || !["open", "awaiting_customer", "resolved"].includes(r.status)) return [];
    const reply = latestReply.get(r.id);
    const awaiting = r.status === "awaiting_customer";
    const resolved = r.status === "resolved";
    const statusReply = reply?.status === r.status ? reply : undefined;
    const when = awaiting || resolved
      ? statusReply?.created_at ?? r.updated_at
      : reply?.created_at ?? (Number.isFinite(Date.parse(r.created_at)) ? r.created_at : r.updated_at);
    if (!include(when)) return [];
    const id = resolved || awaiting
      ? `support-${r.id}-${resolved ? "resolved" : "awaiting"}-${statusReply?.id ?? Date.parse(when)}`
      : reply ? `support-${r.id}-reply-${reply.id}` : `support-${r.id}-opened`;
    return [{
      id,
      category: awaiting ? "action" : "account", tone: "account",
      title: r.status === "resolved" ? "Support case resolved" : awaiting ? "Your support case needs a reply" : reply ? "Support replied to your case" : "Support case received",
      body: r.subject, meta: new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone }).format(new Date(when)),
      href: `/support?case=${r.id}#conversation`, action: "View conversation", visualLabel: "Support",
      preferenceKey: "support_replies",
    }];
  });
}
