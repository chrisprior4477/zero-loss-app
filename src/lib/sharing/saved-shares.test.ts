import { expect, test } from "vitest";
import { parseSavedProductShareList } from "./saved-shares";

test("keeps verified shares and withholds unverifiable decline states", () => {
  const share = { id: "a2345678-aaaa-bbbb-cccc-ddddeeeeffff", token: null, slug: "gift-card", title: "Example",
    sender: "Sample sender", createdAt: "2026-11-01T08:00:00Z", viewedAt: null, savedAt: null, declinedAt: null };
  const report = parseSavedProductShareList([
    share, { ...share, id: "b2345678-aaaa-bbbb-cccc-ddddeeeeffff", declinedAt: "unreadable" },
    { ...share, id: "c2345678-aaaa-bbbb-cccc-ddddeeeeffff", token: "obsolete" },
  ]);
  expect(report).toMatchObject({ shares: [{ id: share.id, declinedAt: null }], incomplete: true });
});
