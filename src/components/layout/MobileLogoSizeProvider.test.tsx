import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MobileLogoSizeProvider, useMobileLogoSize } from "./MobileLogoSizeProvider";
import { MenuLayoutProvider, useMenuLayout } from "./MenuLayoutProvider";
import { MobileLogoSizePicker } from "@/components/account/MobileLogoSizePicker";
import { menuLayouts } from "@/lib/navigation/menu-layout";
import type { MobileLogoSize } from "@/lib/navigation/mobile-logo-size";
const mocks = vi.hoisted(() => ({ save: vi.fn(), menuSave: vi.fn() }));
vi.mock("@/lib/account/mobile-logo-size-action", () => ({ saveMobileLogoSize: mocks.save }));
vi.mock("@/lib/account/menu-layout-action", () => ({ saveMenuLayout: mocks.menuSave }));
function Probe() {
  const logo = useMobileLogoSize(), menu = useMenuLayout();
  return <><output data-testid="state">{JSON.stringify({ size: logo.size, saved: logo.savedSize, trying: logo.trying, layout: menu.layout })}</output>
    <button onClick={logo.dismiss}>Dismiss trial</button><button onClick={logo.cancel}>Cancel trial</button>
    {menuLayouts.map(layout => <button key={layout.id} onClick={() => { logo.dismiss(); menu.preview(layout.id); }}>{layout.id}</button>)}
    <MobileLogoSizePicker /></>;
}
function Fixture({ initialSize = 0, accountId = "owner" }: { initialSize?: MobileLogoSize; accountId?: string }) {
  return <MobileLogoSizeProvider key={accountId} initialSize={initialSize} accountId={accountId}><MenuLayoutProvider initialLayout="classic" accountId={accountId}><Probe /></MenuLayoutProvider></MobileLogoSizeProvider>;
}
const state = () => JSON.parse(screen.getByTestId("state").textContent!);
beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); mocks.save.mockResolvedValue({ ok: true }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
test("exactly eight compact choices, including Original and excluding 40", () => {
  render(<Fixture />);
  expect(screen.getAllByRole("radio")).toHaveLength(8);
  expect(screen.getByRole("radio", { name: "Original size" })).toBeTruthy();
  expect(screen.queryByRole("radio", { name: "40% bigger" })).toBeNull();
});
test("logo selection changes live and stays independent across all six menu styles", () => {
  render(<Fixture />);
  fireEvent.click(screen.getByRole("radio", { name: "35% bigger" }));
  expect(state()).toMatchObject({ size: 35, saved: 0, trying: true, layout: "classic" });
  for (const layout of menuLayouts) {
    fireEvent.click(screen.getByRole("button", { name: layout.id }));
    expect(state()).toMatchObject({ size: 35, layout: layout.id });
  }
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.menuSave).not.toHaveBeenCalled();
});
test("save succeeds, survives remount, then Original size can be saved", async () => {
  const view = render(<Fixture />);
  fireEvent.click(screen.getByRole("radio", { name: "25% bigger" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep this size" }));
  await waitFor(() => expect(state().saved).toBe(25));
  expect(mocks.save).toHaveBeenCalledWith(25);
  view.unmount(); render(<Fixture initialSize={25} />);
  await waitFor(() => expect(state().size).toBe(25));
  fireEvent.click(screen.getByRole("radio", { name: "Original size" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep this size" }));
  await waitFor(() => expect(state()).toMatchObject({ size: 0, saved: 0 }));
});
test("close preserves a trial without saving; cancel restores saved preference", async () => {
  const view = render(<Fixture initialSize={10} />);
  fireEvent.click(screen.getByRole("radio", { name: "30% bigger" }));
  fireEvent.click(screen.getByRole("button", { name: "Dismiss trial" }));
  expect(state()).toMatchObject({ size: 30, saved: 10, trying: false });
  view.unmount(); render(<Fixture initialSize={10} />);
  await waitFor(() => expect(state()).toMatchObject({ size: 30, trying: false }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel trial" }));
  expect(state()).toMatchObject({ size: 10, saved: 10, trying: false });
  expect(mocks.save).not.toHaveBeenCalled();
});
test("failed saves retain preview and expose retry without claiming success", async () => {
  mocks.save.mockResolvedValue({ ok: false, message: "Please try again." });
  render(<Fixture />);
  fireEvent.click(screen.getByRole("radio", { name: "20% bigger" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep this size" }));
  await screen.findByRole("alert");
  expect(state()).toMatchObject({ size: 20, saved: 0, trying: true });
});
test("a delayed trial restore cannot erase a freshly saved choice", async () => {
  const callbacks: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { callbacks.push(callback); return callbacks.length; });
  render(<Fixture />);
  fireEvent.click(screen.getByRole("radio", { name: "35% bigger" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep this size" }));
  await waitFor(() => expect(state().saved).toBe(35));
  act(() => callbacks.forEach(callback => callback(0)));
  expect(state()).toMatchObject({ size: 35, saved: 35, trying: false });
  expect(sessionStorage.getItem("zero-loss:logo-size-trial:owner")).toBeNull();
});
test("stale trials cannot override newer account preferences or a different account", async () => {
  sessionStorage.setItem("zero-loss:logo-size-trial:owner", JSON.stringify({ size: 35, savedSize: 0 }));
  const view = render(<Fixture initialSize={15} />);
  await waitFor(() => expect(sessionStorage.getItem("zero-loss:logo-size-trial:owner")).toBeNull());
  expect(state()).toMatchObject({ size: 15, saved: 15 });
  fireEvent.click(screen.getByRole("radio", { name: "30% bigger" }));
  view.rerender(<Fixture accountId="another-owner" initialSize={5} />);
  expect(state()).toMatchObject({ size: 5, saved: 5, trying: false });
});

test("restoring an unfinished size preview never reopens its prompt or changes the saved size", async () => {
  sessionStorage.setItem("zero-loss:logo-size-trial:owner", JSON.stringify({ size: 35, savedSize: 25, dismissed: false }));
  const view = render(<Fixture initialSize={25} />);
  await waitFor(() => expect(state()).toMatchObject({ size: 35, saved: 25, trying: false }));
  expect(JSON.parse(sessionStorage.getItem("zero-loss:logo-size-trial:owner")!)).toMatchObject({ dismissed: true });
  view.unmount(); render(<Fixture initialSize={25} />);
  await waitFor(() => expect(state()).toMatchObject({ size: 35, saved: 25, trying: false }));
  fireEvent.click(screen.getByRole("radio", { name: "35% bigger" }));
  expect(state()).toMatchObject({ size: 35, saved: 25, trying: true });
  expect(mocks.save).not.toHaveBeenCalled();
});

test("legacy already-saved logo trials are cleared and selecting the saved size does not reopen a bar", async () => {
  sessionStorage.setItem("zero-loss:logo-size-trial:owner", JSON.stringify({ size: 25, savedSize: 25, dismissed: false }));
  render(<Fixture initialSize={25} />);
  await waitFor(() => expect(sessionStorage.getItem("zero-loss:logo-size-trial:owner")).toBeNull());
  fireEvent.click(screen.getByRole("radio", { name: "25% bigger" }));
  expect(state()).toMatchObject({ size: 25, saved: 25, trying: false });
  expect(mocks.save).not.toHaveBeenCalled();
});

test("an account refresh confirming the current logo choice ends an already-saved trial", async () => {
  const view = render(<Fixture initialSize={0} />);
  fireEvent.click(screen.getByRole("radio", { name: "35% bigger" }));
  expect(state()).toMatchObject({ size: 35, saved: 0, trying: true });
  view.rerender(<Fixture initialSize={35} />);
  await waitFor(() => expect(state()).toMatchObject({ size: 35, saved: 35, trying: false }));
  expect(sessionStorage.getItem("zero-loss:logo-size-trial:owner")).toBeNull();
  expect(mocks.save).not.toHaveBeenCalled();
});

test("a balance-only account refresh leaves a saved logo alone and does not save a manual preview", () => {
  const view = render(<Fixture initialSize={35} />);
  view.rerender(<Fixture initialSize={35} />);
  expect(state()).toMatchObject({ size: 35, saved: 35, trying: false });
  fireEvent.click(screen.getByRole("radio", { name: "20% bigger" }));
  view.rerender(<Fixture initialSize={35} />);
  expect(state()).toMatchObject({ size: 20, saved: 35, trying: true });
  expect(mocks.save).not.toHaveBeenCalled();
});

test("a refreshed logo preference updates the saved value while preserving a different manual preview", () => {
  const view = render(<Fixture initialSize={35} />);
  view.rerender(<Fixture initialSize={30} />);
  expect(state()).toMatchObject({ size: 30, saved: 30, trying: false });
  fireEvent.click(screen.getByRole("radio", { name: "25% bigger" }));
  view.rerender(<Fixture initialSize={20} />);
  expect(state()).toMatchObject({ size: 25, saved: 20, trying: true });
  expect(JSON.parse(sessionStorage.getItem("zero-loss:logo-size-trial:owner")!)).toMatchObject({ size: 25, savedSize: 20 });
  fireEvent.click(screen.getByRole("button", { name: "Cancel trial" }));
  expect(state()).toMatchObject({ size: 20, saved: 20, trying: false });
  expect(mocks.save).not.toHaveBeenCalled();
});
