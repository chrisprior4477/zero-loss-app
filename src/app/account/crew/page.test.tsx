import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ account: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("@/components/account/CrewHub", () => ({ CrewHub: () => null }));
vi.mock("@/components/account/CrewInvitationPrompt", () => ({ CrewInvitationPrompt: () => null }));
import CrewPage from "./page";
const id = "11111111-1111-4111-8111-111111111111";
function query(data: unknown) {
  const chain = { select: vi.fn(), eq: vi.fn(), or: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn(), then: (resolve: (r: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve) };
  [chain.select, chain.eq, chain.or, chain.order, chain.limit, chain.maybeSingle].forEach(fn => fn.mockReturnValue(chain)); return chain;
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.account.mockResolvedValue({ userId: "recipient", activity: { activity: [] } }); mocks.rpc.mockResolvedValue({ data: [] });
});
test("old generic email links surface the signed-in recipient's pending request", async () => {
  const invitation = { id, requester_id: "sender", recipient_id: "recipient", requester_name: "Alex", status: "pending" };
  mocks.from.mockImplementation(table => query(table === "crew_invitations" ? [invitation] : []));
  const page = await CrewPage({ searchParams: Promise.resolve({}) });
  expect(page.props.children[0].props.invitation).toEqual({ id, name: "Alex", status: "pending" });
});
test("a request link cannot show an invitation to its sender or another recipient", async () => {
  mocks.from.mockImplementation(table => query(table === "crew_invitations" ? [{ id, requester_id: "recipient", recipient_id: "someone-else", requester_name: "Private", status: "pending" }] : []));
  const page = await CrewPage({ searchParams: Promise.resolve({ request: id }) });
  expect(page.props.children[0].props.invitation).toBeNull(); expect(page.props.children[0].props.unavailable).toBe(true);
});
