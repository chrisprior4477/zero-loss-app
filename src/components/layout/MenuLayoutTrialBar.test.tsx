import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MenuLayoutProvider, useMenuLayout } from "./MenuLayoutProvider";
import { MenuLayoutTrialBar } from "./MenuLayoutTrialBar";
import { menuDevices, menuLayouts, type MenuLayout } from "@/lib/navigation/menu-layout";
const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/account/menu-layout-action", () => ({ saveMenuLayout: save }));
function Controls() {
  const choice = useMenuLayout();
  return <>{menuLayouts.map(option => <button key={option.id} onClick={() => choice.preview(option.id)}>Try {option.id}</button>)}
    {menuDevices.map(device => <button key={device} onClick={() => choice.selectDevice(device)}>{device}</button>)}
    <button onClick={choice.cancel}>Cancel</button><output>{choice.layout}:{choice.savedLayout}</output>
    <output data-testid="layouts">{JSON.stringify(choice.layouts)}</output></>;
}
function setup(initialLayout: MenuLayout = "classic") {
  return render(<MenuLayoutProvider initialLayout={initialLayout} accountId="owner"><Controls /><MenuLayoutTrialBar /></MenuLayoutProvider>);
}
const bar = () => screen.queryByRole("complementary", { name: "Menu layout trial" });
beforeEach(() => {
  save.mockReset(); save.mockResolvedValue({ ok: true }); sessionStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

test("normal browsing has no trial bar; cancel clears it without saving", () => {
  setup(); expect(bar()).toBeNull();
  fireEvent.click(screen.getByText("Try search-over"));
  expect(screen.getByText("search-over:classic")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Try other styles" }).getAttribute("href")).toBe("/account/profile#personalize-menu");
  fireEvent.click(screen.getByText("Cancel"));
  expect(bar()).toBeNull();
  expect(document.documentElement.style.getPropertyValue("--menu-trial-height")).toBe("");
  expect(save).not.toHaveBeenCalled();
});

test("failed save retains retry; successful save ends the trial and removes its cache", async () => {
  setup(); fireEvent.click(screen.getByText("Try search-over"));
  save.mockResolvedValueOnce({ ok: false, message: "Please retry." });
  fireEvent.click(screen.getByRole("button", { name: "Save layout" }));
  await screen.findByRole("alert");
  expect(screen.getByText("search-over:classic")).toBeTruthy();
  await waitFor(() => expect((screen.getByRole("button", { name: "Save layout" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Save layout" }));
  await waitFor(() => expect(bar()).toBeNull());
  expect(screen.getByText("search-over:search-over")).toBeTruthy();
  expect(sessionStorage.getItem("zero-loss:menu-trial:owner")).toBeNull();
});

test.each(menuLayouts)("$name: old saved-trial records cannot reopen the bar", async ({ id }) => {
  sessionStorage.setItem("zero-loss:menu-trial:owner", JSON.stringify({ layout: id, savedLayout: id, dismissed: false }));
  setup(id);
  await waitFor(() => expect(sessionStorage.getItem("zero-loss:menu-trial:owner")).toBeNull());
  expect(bar()).toBeNull();
  fireEvent.click(screen.getByText("Try " + id));
  expect(bar()).toBeNull();
  expect(screen.getByText(id + ":" + id)).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

test.each(menuLayouts)("$name: X keeps an unsaved preview hidden across reload without saving", async ({ id }) => {
  const saved = id === "classic" ? "search-over" : "classic";
  const first = setup(saved);
  fireEvent.click(screen.getByText("Try " + id));
  fireEvent.click(screen.getByRole("button", { name: "Close layout bar" }));
  expect(bar()).toBeNull();
  first.unmount(); setup(saved);
  await screen.findByText(id + ":" + saved);
  expect(bar()).toBeNull();
  fireEvent.click(screen.getByText("Try " + id));
  expect(bar()).toBeTruthy();
  fireEvent.click(screen.getByText("Cancel"));
  expect(screen.getByText(saved + ":" + saved)).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

test("saving blocks close and device switching, then stays closed after reload and elapsed time", async () => {
  let finish!: (result: { ok: true }) => void;
  save.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const first = setup();
  fireEvent.click(screen.getByText("Try search-over"));
  fireEvent.click(screen.getByRole("button", { name: "Save layout" }));
  expect((screen.getByRole("button", { name: "Close layout bar" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByText("desktop"));
  expect(screen.getByText("search-over:classic")).toBeTruthy();
  await act(async () => finish({ ok: true }));
  await waitFor(() => expect(bar()).toBeNull());
  first.unmount();
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  setup("search-over"); act(() => vi.advanceTimersByTime(5 * 60_000));
  expect(bar()).toBeNull();
  expect(screen.getByText("search-over:search-over")).toBeTruthy();
  expect(save).toHaveBeenCalledExactlyOnceWith("search-over", "mobile");
});

test("device choices start on mobile, and tablet/desktop stay Classic until explicitly changed", async () => {
  setup("home-ending-search");
  expect(screen.getByText("home-ending-search:home-ending-search")).toBeTruthy();
  fireEvent.click(screen.getByText("tablet"));
  expect(screen.getByText("classic:classic")).toBeTruthy();
  fireEvent.click(screen.getByText("Try search-down"));
  fireEvent.click(screen.getByRole("button", { name: "Save layout" }));
  await waitFor(() => expect(bar()).toBeNull());
  expect(save).toHaveBeenCalledExactlyOnceWith("search-down", "tablet");
  fireEvent.click(screen.getByText("desktop"));
  expect(screen.getByText("classic:classic")).toBeTruthy();
  expect(JSON.parse(screen.getByTestId("layouts").textContent!)).toEqual({ mobile: "home-ending-search", tablet: "search-down", desktop: "classic" });
  fireEvent.click(screen.getByText("mobile"));
  expect(screen.getByText("home-ending-search:home-ending-search")).toBeTruthy();
});

test("unfinished desktop trial restores its correct save destination across navigation", async () => {
  const first = setup();
  fireEvent.click(screen.getByText("desktop")); fireEvent.click(screen.getByText("Try search-down-browse"));
  first.unmount(); setup();
  await screen.findByText("search-down-browse:classic");
  expect(bar()).toBeNull();
  // Explicitly trying the restored choice can reopen the confirmation, on Desktop.
  fireEvent.click(screen.getByText("Try search-down-browse"));
  fireEvent.click(screen.getByRole("button", { name: "Save layout" }));
  await waitFor(() => expect(bar()).toBeNull());
  expect(save).toHaveBeenCalledExactlyOnceWith("search-down-browse", "desktop");
});

test.each(menuDevices)("an old %s preview restores silently until a fresh picker action", async device => {
  const key = `zero-loss:menu-trial:owner${device === "mobile" ? "" : `:${device}`}`;
  sessionStorage.setItem(key, JSON.stringify({ layout: "search-down-browse", savedLayout: "classic", dismissed: false }));
  sessionStorage.setItem("zero-loss:menu-trial-target:owner", device);
  const view = setup();
  await screen.findByText("search-down-browse:classic");
  expect(bar()).toBeNull();
  expect(JSON.parse(sessionStorage.getItem(key)!)).toMatchObject({ dismissed: true });
  act(() => window.dispatchEvent(new Event("resize")));
  expect(bar()).toBeNull();
  view.unmount(); setup();
  await screen.findByText("search-down-browse:classic");
  expect(bar()).toBeNull();
  fireEvent.click(screen.getByText("Try search-down-browse"));
  expect(bar()).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

test.each(menuDevices)("an account refresh confirming the %s menu choice ends an already-saved trial", async device => {
  const view = setup();
  fireEvent.click(screen.getByText(device));
  fireEvent.click(screen.getByText("Try search-over"));
  expect(bar()).toBeTruthy();
  // The account response now confirms this preference, e.g. after another tab saved it.
  view.rerender(<MenuLayoutProvider initialLayout={device === "mobile" ? "search-over" : "classic"} initialTabletLayout={device === "tablet" ? "search-over" : "classic"} initialDesktopLayout={device === "desktop" ? "search-over" : "classic"} accountId="owner"><Controls /><MenuLayoutTrialBar /></MenuLayoutProvider>);
  await waitFor(() => expect(bar()).toBeNull());
  expect(screen.getByText("search-over:search-over")).toBeTruthy();
  expect(sessionStorage.getItem(`zero-loss:menu-trial:owner${device === "mobile" ? "" : `:${device}`}`)).toBeNull();
  expect(save).not.toHaveBeenCalled();
});

test("refreshing the balance does not silently save an unrelated manual menu preview", () => {
  const view = setup();
  fireEvent.click(screen.getByText("Try search-down"));
  view.rerender(<MenuLayoutProvider initialLayout="classic" accountId="owner"><Controls /><MenuLayoutTrialBar /></MenuLayoutProvider>);
  expect(screen.getByText("search-down:classic")).toBeTruthy();
  expect(bar()).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});

test("a different refreshed menu preference becomes the cancel target without losing an unfinished preview", () => {
  const view = setup();
  fireEvent.click(screen.getByText("Try search-over"));
  view.rerender(<MenuLayoutProvider initialLayout="search-down" accountId="owner"><Controls /><MenuLayoutTrialBar /></MenuLayoutProvider>);
  expect(screen.getByText("search-over:search-down")).toBeTruthy();
  expect(JSON.parse(sessionStorage.getItem("zero-loss:menu-trial:owner")!)).toMatchObject({ layout: "search-over", savedLayout: "search-down" });
  fireEvent.click(screen.getByText("Cancel"));
  expect(screen.getByText("search-down:search-down")).toBeTruthy();
  expect(bar()).toBeNull();
  expect(save).not.toHaveBeenCalled();
});
