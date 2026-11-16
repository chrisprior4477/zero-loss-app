import { expect, test } from "vitest";
import { supportNotifications } from "./notifications";
const row = { id: "11111111-1111-4111-8111-111111111111", subject: "My case", status: "open", updated_at: "2026-09-21T12:00:00Z" };
test.each(["open", "awaiting_customer", "resolved"])("%s links to the exact private conversation", status => {
  expect(supportNotifications([{ ...row, status }])[0]).toMatchObject({ href: `/support?case=${row.id}#conversation`, body: row.subject, action: "View conversation" });
});
test("new replies get a new notification identity, without altering old read history", () => {
  const updated = { ...row, created_at: row.updated_at, updated_at: "2026-09-21T12:01:00Z" };
  const original = supportNotifications([row])[0];
  expect(supportNotifications([updated])[0].id).toBe(original.id);
  const reply = { case_id: row.id, id: "22222222-2222-4222-8222-222222222222", status: "open", created_at: updated.updated_at };
  const staff = supportNotifications([updated], undefined, [reply])[0];
  expect(staff.id).not.toBe(original.id);
  expect(staff.title).toBe("Support replied to your case");
});
test("malformed records cannot create broken links", () => {
  expect(supportNotifications([null, { ...row, id: "-".repeat(36) }, { ...row, updated_at: "bad" }, { ...row, status: "refunded" }])).toEqual([]);
  expect(supportNotifications(null)).toEqual([]);
});
