export type SupportRecordKind = "order" | "transaction";
export type SupportRecord = {
  kind: SupportRecordKind;
  id: string;
  title: string;
  detail: string;
  amount: number;
  date: string;
  status: string;
  attachable?: boolean;
  verifyAgain?: boolean;
};
export type SupportRecordPage = { records: SupportRecord[]; more: boolean; page?: number; incomplete?: boolean } | { error: string };

export const supportOrderNumber = /^ord_[\da-f]{1,124}$/i;
export const supportTransactionId = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function parseSupportRecord(value: unknown): SupportRecord | undefined {
  if (!value || typeof value !== "object") return;
  const item = value as Partial<SupportRecord>;
  if ((item.kind !== "order" && item.kind !== "transaction") || typeof item.id !== "string"
    || !(item.kind === "order" ? supportOrderNumber : supportTransactionId).test(item.id)
    || typeof item.title !== "string" || typeof item.detail !== "string"
    || typeof item.amount !== "number" || !Number.isSafeInteger(item.amount)
    || typeof item.date !== "string" || !Number.isFinite(Date.parse(item.date)) || typeof item.status !== "string"
    || (item.attachable !== undefined && typeof item.attachable !== "boolean")) return;
  return { kind: item.kind, id: item.id, title: item.title, detail: item.detail, amount: item.amount, date: item.date, status: item.status, ...(item.attachable === undefined ? {} : { attachable: item.attachable }) };
}
