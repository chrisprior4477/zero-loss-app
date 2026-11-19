import { parseSupportRecord, type SupportRecord } from "./records";

export type SupportDraft = {
  requestKey: string;
  subject: string;
  body: string;
  category: string;
  categoryEdited?: boolean;
  subjectEdited?: boolean;
  caseStatus: string;
  uncertain: boolean;
  transactionOrigin?: string;
  record?: SupportRecord;
};

const prefix = "zero-loss-support-draft:";
const lifetime = 24 * 60 * 60 * 1000;

export function supportDraftKey(ownerId: string | undefined, reference: string) {
  return ownerId ? `${prefix}${ownerId}:${reference}` : null;
}

export function readSupportDraft(key: string | null): SupportDraft | null {
  if (!key) return null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (!saved || typeof saved.savedAt !== "number" || saved.savedAt > Date.now() || Date.now() - saved.savedAt > lifetime) {
      sessionStorage.removeItem(key);
      return null;
    }
    const { requestKey, subject, body, category, caseStatus, uncertain } = saved;
    if (typeof requestKey !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(requestKey)
      || typeof subject !== "string" || subject.length > 140 || typeof body !== "string" || body.length > 10000
      || !["wallet", "entry", "reward", "account", "other"].includes(category)
      || !["open", "awaiting_customer", "resolved"].includes(caseStatus) || typeof uncertain !== "boolean") return null;
    const transactionOrigin = typeof saved.transactionOrigin === "string" ? saved.transactionOrigin : undefined;
    const record = parseSupportRecord(saved.record);
    // An uncertain retry must preserve the exact attachment it was sent with.
    if (saved.record !== undefined && !record) return null;
    const categoryEdited = typeof saved.categoryEdited === "boolean" ? saved.categoryEdited : undefined;
    const subjectEdited = typeof saved.subjectEdited === "boolean" ? saved.subjectEdited : undefined;
    return { requestKey, subject, body, category, caseStatus, uncertain, transactionOrigin, record, categoryEdited, subjectEdited };
  } catch { return null; }
}

export function writeSupportDraft(key: string | null, draft: SupportDraft | null) {
  if (!key) return;
  try {
    if (draft) sessionStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() }));
    else sessionStorage.removeItem(key);
  } catch { /* The form remains usable when browser storage is unavailable. */ }
}
