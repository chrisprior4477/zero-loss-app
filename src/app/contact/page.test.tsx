import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ account: vi.fn(), from: vi.fn(), enabled: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: mocks.enabled }));
vi.mock("@/components/support/SupportForm", () => ({ SupportForm: () => <div data-testid="support-form">Support form</div> }));
vi.mock("@/components/catalog/CatalogRequestForm", () => ({ CatalogRequestForm: () => <div data-testid="product-form">Product form</div> }));
import ContactPage from "./page";
const id = "11111111-1111-4111-8111-111111111111";
function casesQuery(data: unknown, error: unknown = null) {
  const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
  [chain.select, chain.eq, chain.order].forEach(fn => fn.mockReturnValue(chain));
  chain.limit.mockResolvedValue({ data, error });
  return chain;
}
beforeEach(() => { vi.resetAllMocks(); mocks.enabled.mockReturnValue(true); mocks.account.mockResolvedValue(null); mocks.from.mockReturnValue(casesQuery([])); });
afterEach(cleanup);
test("signed-out visitors get recovery, public answers and sign-in returning to the form, not an invented address", async () => {
  const { container } = render(await ContactPage());
  expect(screen.getByRole("link", { name: "Sign in to message us" }).getAttribute("href")).toBe("/login?next=%2Fcontact%23message");
  expect(screen.getByRole("link", { name: /Can’t sign in/ }).getAttribute("href")).toBe("/forgot-password");
  expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  expect(screen.queryByTestId("support-form")).toBeNull();
  expect(screen.getByTestId("product-form")).toBeTruthy();
  expect(mocks.from).not.toHaveBeenCalled();
});
test("signed-in Contact renders the existing form inline and only the customer's recent conversations", async () => {
  mocks.account.mockResolvedValue({ userId: "owner" });
  const query = casesQuery([{ id, subject: "My existing request", status: "awaiting_customer" }]);
  mocks.from.mockReturnValue(query);
  render(await ContactPage());
  expect(screen.getByTestId("support-form")).toBeTruthy();
  expect(query.eq).toHaveBeenCalledWith("customer_id", "owner");
  expect(query.limit).toHaveBeenCalledWith(3);
  expect(screen.getByRole("link", { name: /My existing request/ }).getAttribute("href")).toBe(`/support?case=${id}#conversation`);
});
test("failed case loading does not hide the contact form or pretend history is empty", async () => {
  mocks.account.mockResolvedValue({ userId: "owner" });
  mocks.from.mockReturnValue(casesQuery(null, { message: "offline" }));
  render(await ContactPage());
  expect(screen.getByRole("status").textContent).toContain("couldn’t load");
  expect(screen.getByTestId("support-form")).toBeTruthy();
});
test("an account read failure is explained without claiming the visitor is signed out", async () => {
  mocks.account.mockRejectedValue(new Error("offline"));
  render(await ContactPage());
  expect(screen.getByRole("alert").textContent).toContain("couldn’t load your account");
  expect(screen.queryByRole("link", { name: "Sign in to message us" })).toBeNull();
});
test("production never renders the preview support form or reads preview cases", async () => {
  mocks.account.mockResolvedValue({ userId: "owner" }); mocks.enabled.mockReturnValue(false);
  render(await ContactPage());
  expect(screen.getByRole("status").textContent).toContain("unavailable in this environment");
  expect(screen.queryByTestId("support-form")).toBeNull();
  expect(mocks.from).not.toHaveBeenCalled();
});
