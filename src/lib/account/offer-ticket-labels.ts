import type { ActivityItem } from "./activity";

export function offerTicketLabels(offers: ActivityItem[], activity = offers): Record<string, string> {
  const counts = new Map<string, number>();
  for (const item of activity) {
    const suffix = (item.entryId || item.completionOptionId)?.slice(-8);
    if (suffix) counts.set(suffix, (counts.get(suffix) ?? 0) + 1);
  }
  const labels: Record<string, string> = {};
  for (const item of offers) {
    if (!item.completionOptionId) continue;
    const id = item.entryId || item.completionOptionId;
    const suffix = id.slice(-8);
    labels[item.completionOptionId] = `${item.entryId ? "Ticket" : "Offer"} #${counts.get(suffix) === 1 ? suffix : id}`;
  }
  return labels;
}
