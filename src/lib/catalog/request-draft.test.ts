import { afterEach, expect, test, vi } from "vitest";
import { catalogRequestDraftKey, readCatalogRequestDraft, writeCatalogRequestDraft } from "./request-draft";

afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });
const key = catalogRequestDraftKey("customer-a", "Kayaks");
const draft = { requestedItem: "Tandem kayak", email: "person@example.test", notes: "Fishing gear space" };

test.each(["expired", "future", "malformed", "oversized"])("ignores %s stored drafts", kind => {
  const saved = { ...draft, savedAt: Date.now() };
  if (kind === "expired") saved.savedAt -= 24 * 60 * 60 * 1000 + 1;
  if (kind === "future") saved.savedAt += 60_000;
  if (kind === "oversized") saved.notes = "x".repeat(1001);
  sessionStorage.setItem(key, kind === "malformed" ? "not-json" : JSON.stringify(saved));
  expect(readCatalogRequestDraft(key)).toBeNull();
});

test("keeps valid text and can explicitly discard it", () => {
  writeCatalogRequestDraft(key, draft);
  expect(readCatalogRequestDraft(key)).toEqual(draft);
  writeCatalogRequestDraft(key, null);
  expect(readCatalogRequestDraft(key)).toBeNull();
});
