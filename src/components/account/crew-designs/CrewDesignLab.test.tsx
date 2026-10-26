import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
const actions = vi.hoisted(() => ({ getCrewSharedPicks: vi.fn() }));
vi.mock("@/lib/crew/actions", () => actions);
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("./CrewInlineFinder", () => ({ CrewInlineFinder: () => <div>Inline finder</div> }));
import { CrewDesignLab } from "./CrewDesignLab";
import { PRODUCT_SHARE_EVENT } from "@/lib/sharing/product-share";
const member = { id: "11111111-1111-4111-8111-111111111111", name: "Connected Chris", photo: null };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  actions.getCrewSharedPicks.mockResolvedValue({ ok: true, picks: [] });
  window.history.replaceState(null, "", "/account/crew?design=1");
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function mount(initialDesign = 1, members = [member]) {
  return render(<CrewDesignLab initialDesign={initialDesign} members={members} ownProducts={[]} automotive={{ slug: "directory-autozone-100-gift-card", title: "$100 AutoZone Gift Card", retailer: "AutoZone", image: "/catalog/partner-cards/autozone.webp" }} available pendingRequests={1} />);
}

test("all eight review choices switch the experience and its bookmark URL", () => {
  const { container } = mount();
  const choices = within(screen.getByRole("navigation", { name: "Choose a Crew design" })).getAllByRole("button");
  expect(choices).toHaveLength(8);
  choices.forEach((button, index) => {
    fireEvent.click(button);
    expect(container.querySelector("[data-design]")?.getAttribute("data-design")).toBe(String(index + 1));
    expect(new URL(window.location.href).searchParams.get("design")).toBe(String(index + 1));
  });
});

test("switching person loads that member's shared picks and does not reuse the previous person's picks", async () => {
  actions.getCrewSharedPicks.mockResolvedValue({ ok: true, picks: [{ offeringSlug: "shared-tv", title: "Chris’s shared TV", retailer: "Best Buy", image: "/catalog/samsung-m70h-tv-real.png", sharedAt: "2026-10-26T12:00:00Z" }] });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "See Connected Chris’s shared picks" }));
  await screen.findByRole("heading", { name: "Chris’s shared TV" });
  expect(actions.getCrewSharedPicks).toHaveBeenCalledExactlyOnceWith(member.id);
  expect(screen.queryByRole("heading", { name: "Maya’s shared picks" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "See Maya’s shared picks" }));
  fireEvent.click(screen.getByRole("button", { name: "See Connected Chris’s shared picks" }));
  expect(actions.getCrewSharedPicks).toHaveBeenCalledTimes(1);
});

test("the everyone feed loads approved members and stops retrying a failed read until requested", async () => {
  actions.getCrewSharedPicks.mockRejectedValue(new Error("offline"));
  mount(3);
  await waitFor(() => expect(actions.getCrewSharedPicks).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getAllByRole("button", { name: "Connected Chris" })[0]);
  await screen.findByText("These picks couldn’t load.");
  expect(actions.getCrewSharedPicks).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "View shared picks" }));
  await waitFor(() => expect(actions.getCrewSharedPicks).toHaveBeenCalledTimes(2));
});

test("discovery filters interests and previews following separately from private Crew", () => {
  mount(8, []);
  fireEvent.click(screen.getByRole("button", { name: "Automotive" }));
  expect(screen.getByRole("heading", { name: "Automotive people to discover" })).toBeTruthy();
  expect(screen.getAllByRole("link", { name: "View $100 AutoZone Gift Card" }).length).toBeGreaterThan(0);
  fireEvent.click(screen.getAllByRole("button", { name: "+ Follow" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Following 1" }));
  expect(screen.getAllByRole("button", { name: "Following ✓" })).toHaveLength(1);
  expect(actions.getCrewSharedPicks).not.toHaveBeenCalled();
});

test("sharing an item opens the established share flow with the correct product", () => {
  mount(7, []);
  const listener = vi.fn(); window.addEventListener(PRODUCT_SHARE_EVENT, listener);
  fireEvent.click(screen.getByRole("button", { name: "Choose where to share" }));
  expect(listener).toHaveBeenCalledTimes(1);
  expect((listener.mock.calls[0][0] as CustomEvent).detail.slug).toBeTruthy();
  window.removeEventListener(PRODUCT_SHARE_EVENT, listener);
});
