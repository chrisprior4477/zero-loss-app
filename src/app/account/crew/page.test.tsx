import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ account: vi.fn(), from: vi.fn(), rpc: vi.fn(), preview: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("@/components/account/CrewHub", () => ({ CrewHub: () => null }));
vi.mock("@/components/account/CrewInvitationPrompt", () => ({ CrewInvitationPrompt: () => null }));
vi.mock("@/components/account/crew-designs/CrewDesignLab", () => ({ CrewDesignLab: () => null }));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: mocks.preview }));
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

test("design review exposes approved connections only and keeps pending requests separate", async () => {
  mocks.preview.mockReturnValue(true);
  const accepted = { id, requester_id: "friend", recipient_id: "recipient", requester_name: "Friend", status: "accepted" };
  const pending = { ...accepted, id: "pending", requester_id: "not-connected", status: "pending" };
  mocks.from.mockImplementation(table => query(table === "crew_invitations" ? [accepted, pending] : []));
  mocks.rpc.mockImplementation(name => Promise.resolve({ data: name === "get_crew_member_profiles" ? [{ member_id: "friend", name: "Chosen name", avatar_reference: null }] : [] }));
  const page = await CrewPage({ searchParams: Promise.resolve({ design: "8" }) });
  expect(page.props.initialDesign).toBe(8);
  expect(page.props.members).toEqual([{ id: "friend", name: "Chosen name", photo: null }]);
  expect(page.props.pendingRequests).toBe(1);
});

test("design review is unavailable outside the preview environment", async () => {
  mocks.preview.mockReturnValue(false); mocks.from.mockReturnValue(query([]));
  const page = await CrewPage({ searchParams: Promise.resolve({ design: "1" }) });
  expect(page.props.initialDesign).toBeUndefined();
  expect(page.props.children[1].props.initialTab).toBe("crew");
});

test("out-of-range design selectors retain the existing Crew page", async () => {
  mocks.preview.mockReturnValue(true); mocks.from.mockReturnValue(query([]));
  for (const design of ["0", "9", "2.5", "unknown"]) {
    const page = await CrewPage({ searchParams: Promise.resolve({ design }) });
    expect(page.props.initialDesign).toBeUndefined();
  }
});
