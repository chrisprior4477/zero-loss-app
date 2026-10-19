import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MenuLayoutProvider, useMenuLayout } from "./MenuLayoutProvider";
import { MenuLayoutTrialBar } from "./MenuLayoutTrialBar";
import { MenuLayoutPicker } from "@/components/account/MenuLayoutPicker";
const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/account/menu-layout-action", () => ({ saveMenuLayout: save }));
function Controls() {
  const choice = useMenuLayout();
  return <><button onClick={() => choice.preview("search-over")}>Try five</button><button onClick={choice.cancel}>Cancel</button><output>{choice.layout}:{choice.savedLayout}</output></>;
}
function setup(accountId?: string) { return render(<MenuLayoutProvider initialLayout="classic" accountId={accountId}><Controls /><MenuLayoutTrialBar /></MenuLayoutProvider>); }
beforeEach(() => {
  save.mockReset(); save.mockResolvedValue({ ok: true }); sessionStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
test("normal browsing has no trial bar; trial has direct return and cancel clears it", () => {
  setup(); expect(screen.queryByRole("complementary", { name: "Menu layout trial" })).toBeNull();
  fireEvent.click(screen.getByText("Try five"));
  expect(screen.getByText("search-over:classic")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Try other styles" }).getAttribute("href")).toBe("/account/profile#personalize-menu");
  fireEvent.click(screen.getByText("Cancel"));
  expect(screen.queryByRole("complementary", { name: "Menu layout trial" })).toBeNull();
  expect(document.documentElement.style.getPropertyValue("--menu-trial-height")).toBe("");
  expect(save).not.toHaveBeenCalled();
});
test("failed save keeps trial and default separate; successful save ends trial", async () => {
  setup(); fireEvent.click(screen.getByText("Try five"));
  save.mockResolvedValueOnce({ ok: false, message: "Please retry." });
  fireEvent.click(screen.getByRole("button", { name: "Keep this layout" }));
  await screen.findByRole("alert");
  expect(screen.getByText("search-over:classic")).toBeTruthy();
  const retry = await screen.findByRole("button", { name: "Keep this layout" });
  fireEvent.click(retry);
  await waitFor(() => expect(screen.queryByRole("complementary", { name: "Menu layout trial" })).toBeNull());
  expect(screen.getByText("search-over:search-over")).toBeTruthy();
});
test("trial survives reload in this account's session, not another account", () => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  const first = setup("owner"); act(() => vi.runAllTimers());
  fireEvent.click(screen.getByText("Try five")); first.unmount();
  const next = setup("owner"); act(() => vi.runAllTimers());
  expect(screen.getByText("search-over:classic")).toBeTruthy(); next.unmount();
  setup("another"); act(() => vi.runAllTimers());
  expect(screen.getByText("classic:classic")).toBeTruthy();
});

test("previewing saved number five still shows the return bar, including after reload", () => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  const view = render(<MenuLayoutProvider initialLayout="search-down-browse" accountId="owner"><MenuLayoutPicker /><MenuLayoutTrialBar /></MenuLayoutProvider>);
  act(() => vi.runAllTimers());
  expect(screen.queryByRole("complementary", { name: "Menu layout trial" })).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: "5. Search push down with Ending Soon & Browse" }));
  expect(screen.getByRole("complementary", { name: "Menu layout trial" })).toBeTruthy();
  expect((screen.getByRole("button", { name: "Layout saved" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("link", { name: "Try other styles" })).toBeTruthy();
  view.unmount();
  render(<MenuLayoutProvider initialLayout="search-down-browse" accountId="owner"><Controls /><MenuLayoutTrialBar /></MenuLayoutProvider>);
  act(() => vi.runAllTimers());
  expect(screen.getByRole("complementary", { name: "Menu layout trial" })).toBeTruthy();
  fireEvent.click(screen.getByText("Cancel"));
  expect(screen.queryByRole("complementary", { name: "Menu layout trial" })).toBeNull();
  expect(save).not.toHaveBeenCalled();
});
