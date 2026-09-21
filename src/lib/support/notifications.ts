import type { AccountNotification } from "@/lib/account/notifications";

export function supportNotifications(rows: unknown): AccountNotification[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((r): AccountNotification[] => {
    if (!r || typeof r.id !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(r.id) || typeof r.subject !== "string" || typeof r.updated_at !== "string" ||
      !Number.isFinite(Date.parse(r.updated_at)) || !["open", "awaiting_customer", "resolved"].includes(r.status)) return [];
    return [{
      id: `support-${r.id}-${r.updated_at}`, category: "account", tone: "account",
      title: r.status === "resolved" ? "Support case resolved" : r.status === "awaiting_customer" ? "Your support case needs a reply" : "Support case received",
      body: r.subject, meta: new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(r.updated_at)),
      href: `/support?case=${r.id}#conversation`, action: "View conversation", visualLabel: "Support",
    }];
  });
}
