import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MenuLayoutProvider, useMenuLayout } from "@/components/layout/MenuLayoutProvider";
import { MenuLayoutPicker } from "./MenuLayoutPicker";
import { menuLayouts, showsShoppingCategories } from "@/lib/navigation/menu-layout";
const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/account/menu-layout-action", () => ({ saveMenuLayout: save }));
function ActiveMenu() { const { layout, savedLayout } = useMenuLayout(); return <output data-testid="active-menu">{layout}:{savedLayout}</output>; }
function setup() {
  render(<MenuLayoutProvider initialLayout="classic"><ActiveMenu /><MenuLayoutPicker /></MenuLayoutProvider>);
}
beforeEach(() => { save.mockReset(); save.mockResolvedValue({ ok: true }); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

test("all choices are visible immediately, but the preview waits for a choice—even Classic", () => {
  setup();
  expect(screen.getAllByRole("radio")).toHaveLength(5);
  expect(screen.queryByRole("group", { name: "Interactive menu preview" })).toBeNull();
  expect(document.querySelector("#personalize-menu details")).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: "1. Classic" }));
  expect(screen.getByRole("group", { name: "Interactive menu preview" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
  expect(screen.queryByRole("group", { name: "Interactive menu preview" })).toBeNull();
});

test("all five choices preview immediately, cancel restores the saved menu, and previews do not write", () => {
  setup();
  for (const [index, option] of menuLayouts.entries()) {
    fireEvent.click(screen.getByRole("radio", { name: `${index + 1}. ${option.name}` }));
    expect(screen.getByTestId("active-menu").textContent).toBe(`${option.id}:classic`);
  }
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel preview" }));
  expect(screen.getByTestId("active-menu").textContent).toBe("classic:classic");
});

test("Keep saves the chosen layout; a failed save retains the previous saved choice", async () => {
  setup();
  fireEvent.click(screen.getByRole("radio", { name: /Search push down/ }));
  fireEvent.click(screen.getByRole("button", { name: "Keep this layout" }));
  await screen.findByText("Your menu choice is saved.");
  expect(save).toHaveBeenCalledWith("search-down");
  expect(screen.getByTestId("active-menu").textContent).toBe("search-down:search-down");
  save.mockResolvedValue({ ok: false, message: "Please try again." });
  fireEvent.click(screen.getByRole("radio", { name: /Search in place/ }));
  fireEvent.click(screen.getByRole("button", { name: "Keep this layout" }));
  await screen.findByRole("alert");
  await waitFor(() => expect(screen.getByRole("button", { name: "Cancel preview" }).hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Cancel preview" }));
  expect(screen.getByTestId("active-menu").textContent).toBe("search-down:search-down");
});

test("compact Keep New Layout button shares the durable save and shows success beside the badge", async () => {
  setup();
  const button = screen.getByRole("button", { name: "Keep New Layout" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(screen.getByRole("radio", { name: "4. Search push down" }));
  expect(button.disabled).toBe(false);
  fireEvent.click(button);
  await screen.findByText("Your menu choice is saved.");
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith("search-down");
  expect(screen.getByText("Current style: Search push down")).toBeTruthy();
  expect((await screen.findByRole("button", { name: "Keep New Layout" }) as HTMLButtonElement).disabled).toBe(true);
});

test.each(menuLayouts.filter(option => option.id !== "classic"))("$name preview dismisses outside and cancels the remaining automatic animation", option => {
  vi.useFakeTimers(); setup();
  fireEvent.click(screen.getByRole("radio", { name: `${menuLayouts.indexOf(option) + 1}. ${option.name}` }));
  act(() => vi.advanceTimersByTime(600));
  const header = screen.getByRole("group", { name: "Interactive menu preview" }).querySelector("header")!;
  expect(header.dataset.searchOpen).toBe("true");
  fireEvent.pointerDown(document.body);
  expect(header.dataset.searchOpen).toBe("false");
  act(() => vi.advanceTimersByTime(3000));
  expect(header.dataset.searchOpen).toBe("false");
  expect(screen.queryByDisplayValue("Coffee")).toBeNull();
});

test.each(menuLayouts)("$name automatically demonstrates search and can replay it", option => {
  vi.useFakeTimers(); setup();
  fireEvent.click(screen.getByRole("radio", { name: `${menuLayouts.indexOf(option) + 1}. ${option.name}` }));
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.getByDisplayValue("Coffee")).toBeTruthy();
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.queryByDisplayValue("Coffee")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Replay animation/ }));
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.getByDisplayValue("Coffee")).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

test.each(menuLayouts)("$name lets customers try search and navigation without leaving Profile", option => {
  vi.useFakeTimers(); setup();
  fireEvent.click(screen.getByRole("radio", { name: `${menuLayouts.indexOf(option) + 1}. ${option.name}` }));
  act(() => vi.advanceTimersByTime(3000));
  const demo = screen.getByRole("group", { name: "Interactive menu preview" });
  const input = within(demo).getByRole("searchbox");
  if (option.id.startsWith("search-")) fireEvent.click(within(demo).getByRole("button", { name: "Open search" }));
  fireEvent.focus(input); fireEvent.change(input, { target: { value: "Publix" } });
  fireEvent.click(within(demo).getByRole("button", { name: "Go to search results" }));
  expect(screen.getByText('Preview: Search results for “Publix”. Menu actions here won’t leave Profile.')).toBeTruthy();
  expect(demo.querySelector("header")?.dataset.searchOpen).toBe("false");
  fireEvent.click(within(demo).getByRole("link", { name: "ZeroLoss home" }));
  expect(screen.getByText("Preview: Home. Menu actions here won’t leave Profile.")).toBeTruthy();
  fireEvent.click(within(demo).getByRole("button", { name: "Open account menu" }));
  fireEvent.click(within(demo).getByRole("button", { name: "Your Profile" }));
  expect(screen.getByText("Preview: Your Profile. Menu actions here won’t leave Profile.")).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

test("interacting interrupts the animation so it cannot overwrite a typed query", () => {
  vi.useFakeTimers(); setup();
  fireEvent.click(screen.getByRole("radio", { name: "4. Search push down" }));
  const demo = screen.getByRole("group", { name: "Interactive menu preview" });
  fireEvent.pointerDown(demo.querySelector("button")!);
  fireEvent.focus(within(demo).getByRole("searchbox"));
  fireEvent.change(within(demo).getByRole("searchbox"), { target: { value: "My search" } });
  act(() => vi.advanceTimersByTime(4000));
  expect(screen.getByDisplayValue("My search")).toBeTruthy();
});

test.each(menuLayouts)("$name has a non-clickable scrollable page, with compact categories inside it", option => {
  setup();
  fireEvent.click(screen.getByRole("radio", { name: `${menuLayouts.indexOf(option) + 1}. ${option.name}` }));
  const demo = screen.getByRole("group", { name: "Interactive menu preview" });
  const page = within(demo).getByRole("region", { name: "Scrollable page preview" });
  expect(page.tabIndex).toBe(0);
  expect(page.querySelector("[inert][aria-hidden='true']")).toBeTruthy();
  expect(page.querySelector("[data-preview-page-categories]") !== null).toBe(option.id !== "classic");
  expect(demo.querySelector("header")?.contains(page)).toBe(false);
  expect(within(page).queryByRole("link")).toBeNull();
  const category = page.querySelector<HTMLAnchorElement>("a[href]");
  if (category) fireEvent.click(category);
  expect(screen.getByText("Preview: Home. Menu actions here won’t leave Profile.")).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

test("shopping bar includes browsing and favorites but excludes account tasks", () => {
  for (const path of ["/", "/browse", "/items/amazon-100-gift-card", "/rewards/amazon", "/account/favorites"]) expect(showsShoppingCategories(path)).toBe(true);
  for (const path of ["/account/profile", "/account/wallet", "/account/entries", "/account/notifications", "/login", "/how-it-works"]) expect(showsShoppingCategories(path)).toBe(false);
});
