import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ account: vi.fn(), from: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/account/NotificationsCenter", () => ({ NotificationsCenter: () => null }));
import NotificationsPage from "./page";
import type { ReactElement } from "react";
import type { AccountNotification } from "@/lib/account/notifications";
const id = "11111111-1111-4111-8111-111111111111";
function query(data: unknown, error: unknown = null) {
  const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), in: vi.fn(), then: (resolve: (r: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve) };
  [chain.select, chain.eq, chain.order, chain.limit, chain.in].forEach(fn => fn.mockReturnValue(chain));
  return chain;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.account.mockResolvedValue({ userId: "owner", emailConfirmed: true, wallet: null, activity: { source: "customer-empty", activity: [] } });
});
test("signed-out visitors return to Notifications after login", async () => {
  mocks.account.mockResolvedValue(null);
  mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
  await expect(NotificationsPage()).rejects.toThrow("NEXT_REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Faccount%2Fnotifications");
  expect(mocks.from).not.toHaveBeenCalled();
});
test("Crew, support and persisted read receipts are scoped to the signed-in owner", async () => {
  const crew = query([{ id, requester_name: "Sam" }]);
  const support = query([{ id, subject: "Demo case", status: "awaiting_customer", updated_at: "2026-09-21T12:00:00Z" }]);
  const reads = query([{ notification_id: `crew-${id}` }]);
  mocks.from.mockImplementation(table => ({ crew_invitations: crew, support_cases: support, customer_notification_reads: reads })[table as string]);
  const page = await NotificationsPage();
  const center = page.props.children[1] as ReactElement<{ notifications: AccountNotification[]; initialReadIds: string[]; readAvailable: boolean }>;
  expect(center.props.notifications.find(item => item.crewRequestId === id)?.href).toBe(`/account/crew?tab=requests&request=${id}#crew-request-${id}`);
  expect(center.props.notifications.find(item => item.id.startsWith("support-"))?.href).toBe(`/support?case=${id}#conversation`);
  expect(center.props.initialReadIds).toEqual([`crew-${id}`]);
  expect(crew.eq).toHaveBeenCalledWith("recipient_id", "owner");
  expect(crew.eq).toHaveBeenCalledWith("status", "pending");
  expect(support.eq).toHaveBeenCalledWith("customer_id", "owner");
  expect(reads.eq).toHaveBeenCalledWith("customer_id", "owner");
});
