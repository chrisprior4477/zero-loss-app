import { expect, test } from "vitest";
import { supportNotifications } from "./notifications";
const row = { id: "11111111-1111-4111-8111-111111111111", subject: "My case", status: "open", updated_at: "2026-09-21T12:00:00Z" };
test.each(["open", "awaiting_customer", "resolved"])("%s links to the exact private conversation", status => {
  expect(supportNotifications([{ ...row, status }])[0]).toMatchObject({ href: `/support?case=${row.id}#conversation`, body: row.subject, action: "View conversation" });
});
test("new replies get a new notification identity, without altering old read history", () => {
  expect(supportNotifications([row])[0].id).not.toBe(supportNotifications([{ ...row, updated_at: "2026-09-21T12:01:00Z" }])[0].id);
});
test("malformed records cannot create broken links", () => {
  expect(supportNotifications([null, { ...row, id: "-".repeat(36) }, { ...row, updated_at: "bad" }, { ...row, status: "refunded" }])).toEqual([]);
  expect(supportNotifications(null)).toEqual([]);
});
