import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MenuLayoutProvider, useMenuLayout } from "@/components/layout/MenuLayoutProvider";
import { MenuLayoutPicker } from "./MenuLayoutPicker";
import { menuLayouts, showsShoppingCategories } from "@/lib/navigation/menu-layout";
const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/account/menu-layout-action", () => ({ saveMenuLayout: save }));
function ActiveMenu() { const { layout, savedLayout } = useMenuLayout(); return <output data-testid="active-menu">{layout}:{savedLayout}</output>; }
function setup() {
  render(<MenuLayoutProvider initialLayout="classic"><ActiveMenu /><MenuLayoutPicker /></MenuLayoutProvider>);
  fireEvent.click(screen.getByText("Personalize your top menu"));
}
beforeEach(() => { save.mockReset(); save.mockResolvedValue({ ok: true }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

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

test("the demonstration opens, types and closes without running a real search", () => {
  vi.useFakeTimers(); setup();
  fireEvent.click(screen.getByRole("radio", { name: /Search in place/ }));
  fireEvent.click(screen.getByRole("button", { name: /Play search preview/ }));
  act(() => vi.advanceTimersByTime(1200));
  expect(screen.getByText("Coffee")).toBeTruthy();
  act(() => vi.advanceTimersByTime(1500));
  expect(screen.queryByText("Coffee")).toBeNull();
  expect(save).not.toHaveBeenCalled();
});

test("shopping bar includes browsing and favorites but excludes account tasks", () => {
  for (const path of ["/", "/browse", "/items/amazon-100-gift-card", "/rewards/amazon", "/account/favorites"]) expect(showsShoppingCategories(path)).toBe(true);
  for (const path of ["/account/profile", "/account/wallet", "/account/entries", "/account/notifications", "/login", "/how-it-works"]) expect(showsShoppingCategories(path)).toBe(false);
});
