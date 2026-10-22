import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MenuLayoutProvider, useMenuLayout } from "./MenuLayoutProvider";
import { MenuLayoutTrialBar } from "./MenuLayoutTrialBar";
import { MenuLayoutPicker } from "@/components/account/MenuLayoutPicker";
import { menuLayouts } from "@/lib/navigation/menu-layout";
const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/account/menu-layout-action", () => ({ saveMenuLayout: save }));
function Controls() {
  const choice = useMenuLayout();
  return <>{menuLayouts.map(option => <button key={option.id} onClick={() => choice.preview(option.id)}>Try {option.id}</button>)}<button onClick={choice.cancel}>Cancel</button><output>{choice.layout}:{choice.savedLayout}</output></>;
}
function setup(accountId?: string) { return render(<MenuLayoutProvider initialLayout="classic" accountId={accountId}><Controls /><MenuLayoutTrialBar /></MenuLayoutProvider>); }
beforeEach(() => {
  save.mockReset(); save.mockResolvedValue({ ok: true }); sessionStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
test("normal browsing has no trial bar; trial has direct return and cancel clears it", () => {
  setup(); expect(screen.queryByRole("complementary", { name: "Menu layout trial" })).toBeNull();
  fireEvent.click(screen.getByText("Try search-over"));
  expect(screen.getByText("search-over:classic")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Try other styles" }).getAttribute("href")).toBe("/account/profile#personalize-menu");
  fireEvent.click(screen.getByText("Cancel"));
  expect(screen.queryByRole("complementary", { name: "Menu layout trial" })).toBeNull();
  expect(document.documentElement.style.getPropertyValue("--menu-trial-height")).toBe("");
  expect(save).not.toHaveBeenCalled();
});
test("failed save keeps trial and default separate; successful save leaves the bar available until closed", async () => {
  setup(); fireEvent.click(screen.getByText("Try search-over"));
  save.mockResolvedValueOnce({ ok: false, message: "Please retry." });
  fireEvent.click(screen.getByRole("button", { name: "Save layout" }));
  await screen.findByRole("alert");
  expect(screen.getByText("search-over:classic")).toBeTruthy();
  const retry = await screen.findByRole("button", { name: "Save layout" });
  fireEvent.click(retry);
  await screen.findByRole("button", { name: "Layout saved" });
  expect(screen.getByText("search-over:search-over")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Try other styles" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close layout bar" }));
  expect(screen.queryByRole("complementary", { name: "Menu layout trial" })).toBeNull();
  expect(screen.getByText("search-over:search-over")).toBeTruthy();
});
test("trial survives reload in this account's session, not another account", () => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  const first = setup("owner"); act(() => vi.runAllTimers());
  fireEvent.click(screen.getByText("Try search-over")); first.unmount();
  const next = setup("owner"); act(() => vi.runAllTimers());
  expect(screen.getByText("search-over:classic")).toBeTruthy(); next.unmount();
  setup("another"); act(() => vi.runAllTimers());
  expect(screen.getByText("classic:classic")).toBeTruthy();
});

test.each(menuLayouts)("$name: a saved layout can be dismissed, stays dismissed on reload, and can be tried again", option => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  const content = <MenuLayoutProvider initialLayout={option.id} accountId="owner"><Controls /><MenuLayoutTrialBar /></MenuLayoutProvider>;
  const first = render(content); act(() => vi.runAllTimers());
  fireEvent.click(screen.getByText(`Try ${option.id}`));
  expect((screen.getByRole("button", { name: "Layout saved" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Close layout bar" }));
  expect(screen.queryByRole("complementary", { name: "Menu layout trial" })).toBeNull();
  expect(screen.getByText(`${option.id}:${option.id}`)).toBeTruthy();
  expect(document.documentElement.style.getPropertyValue("--menu-trial-height")).toBe("");
  first.unmount(); render(content); act(() => vi.runAllTimers());
  expect(screen.queryByRole("complementary", { name: "Menu layout trial" })).toBeNull();
  expect(screen.getByText(`${option.id}:${option.id}`)).toBeTruthy();
  fireEvent.click(screen.getByText(`Try ${option.id}`));
  expect(screen.getByRole("complementary", { name: "Menu layout trial" })).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

test.each(menuLayouts)("$name: closing an unsaved trial hides only the bar and never saves the choice", option => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  const saved = option.id === "classic" ? "search-over" : "classic";
  const content = <MenuLayoutProvider initialLayout={saved} accountId="owner"><Controls /><MenuLayoutTrialBar /></MenuLayoutProvider>;
  const first = render(content); act(() => vi.runAllTimers());
  fireEvent.click(screen.getByText(`Try ${option.id}`));
  fireEvent.click(screen.getByRole("button", { name: "Close layout bar" }));
  expect(screen.getByText(`${option.id}:${saved}`)).toBeTruthy();
  first.unmount(); render(content); act(() => vi.runAllTimers());
  expect(screen.queryByRole("complementary", { name: "Menu layout trial" })).toBeNull();
  expect(screen.getByText(`${option.id}:${saved}`)).toBeTruthy();
  fireEvent.click(screen.getByText(`Try ${option.id}`));
  expect(screen.getByRole("button", { name: "Save layout" })).toBeTruthy();
  fireEvent.click(screen.getByText("Cancel"));
  expect(screen.getByText(`${saved}:${saved}`)).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

test("saving disables close until completion and preserves the saved choice after dismissal and reload", async () => {
  let finish!: (result: { ok: true }) => void;
  save.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const first = setup("owner");
  fireEvent.click(screen.getByText("Try search-over"));
  fireEvent.click(screen.getByRole("button", { name: "Save layout" }));
  const close = screen.getByRole("button", { name: "Close layout bar" }) as HTMLButtonElement;
  expect(close.disabled).toBe(true);
  fireEvent.click(close);
  expect(screen.getByRole("complementary", { name: "Menu layout trial" })).toBeTruthy();
  await act(async () => finish({ ok: true }));
  await waitFor(() => expect(close.disabled).toBe(false));
  expect(screen.getByRole("button", { name: "Layout saved" })).toBeTruthy();
  expect(JSON.parse(sessionStorage.getItem("zero-loss:menu-trial:owner")!)).toEqual({ layout: "search-over", savedLayout: "search-over", dismissed: false });
  fireEvent.click(close);
  first.unmount();
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  render(<MenuLayoutProvider initialLayout="search-over" accountId="owner"><Controls /><MenuLayoutTrialBar /></MenuLayoutProvider>);
  act(() => vi.runAllTimers());
  expect(screen.queryByRole("complementary", { name: "Menu layout trial" })).toBeNull();
  expect(screen.getByText("search-over:search-over")).toBeTruthy();
  expect(save).toHaveBeenCalledExactlyOnceWith("search-over");
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
