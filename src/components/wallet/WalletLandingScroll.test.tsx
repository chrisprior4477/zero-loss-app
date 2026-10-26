import { act, cleanup, fireEvent, render } from "@testing-library/react";
import Link from "next/link";
import { afterEach, expect, test, vi } from "vitest";
import { WalletLandingScroll } from "./WalletLandingScroll";
import { menuLayouts } from "@/lib/navigation/menu-layout";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.querySelectorAll("[data-scroll-fixture]").forEach(element => element.remove());
  window.history.replaceState({}, "", "/");
});

function setup({ hash = "", mobile = true, headerHeight = 91 } = {}) {
  window.history.replaceState({}, "", "/account/wallet?view=history" + hash);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: mobile })));
  vi.stubGlobal("scrollY", 200);
  const scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  const frames = new Map<number, FrameRequestCallback>();
  let nextId = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++nextId, callback); return nextId; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
  const flush = () => {
    act(() => {
      while (frames.size) {
        const [id, callback] = frames.entries().next().value!;
        frames.delete(id);
        callback(0);
      }
    });
  };
  const header = document.createElement("header");
  header.dataset.scrollFixture = "";
  header.className = "sticky";
  header.getBoundingClientRect = vi.fn(() => new DOMRect(0, 0, 390, headerHeight));
  const balance = document.createElement("article");
  balance.id = "balance";
  balance.dataset.scrollFixture = "";
  balance.getBoundingClientRect = vi.fn(() => new DOMRect(0, 610, 390, 560));
  document.body.append(header, balance);
  return { scrollTo, flush, frames, header, balance };
}

test.each(menuLayouts)("$name lands ordinary mobile wallet visits below its measured header", ({ id }) => {
  const headerHeight = id === "classic" ? 128 : id === "search-over" ? 57 : id.startsWith("search-down") ? 48 : 91;
  const { scrollTo, flush } = setup({ headerHeight });
  render(<WalletLandingScroll />);
  expect(scrollTo).not.toHaveBeenCalled();
  flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 810 - headerHeight - 12, behavior: "auto" });
});

test("the coin's balance anchor also lands below the mobile header", () => {
  const { scrollTo, flush } = setup({ hash: "#balance" });
  render(<WalletLandingScroll />);
  flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 707, behavior: "auto" });
});

test.each(["#add-funds", "#transactions", "#transaction-existing", "#payment-deposits"])("preserves the explicit %s destination", hash => {
  const { scrollTo, flush } = setup({ hash });
  render(<WalletLandingScroll />);
  flush();
  expect(scrollTo).not.toHaveBeenCalled();
});

test("desktop ordinary visits keep their existing landing", () => {
  const { scrollTo, flush } = setup({ mobile: false });
  render(<WalletLandingScroll />);
  flush();
  expect(scrollTo).not.toHaveBeenCalled();
});

test("selected transactions and funding returns can disable the landing", () => {
  const { scrollTo, flush } = setup();
  const view = render(<WalletLandingScroll enabled={false} />);
  flush();
  expect(scrollTo).not.toHaveBeenCalled();
  view.rerender(<WalletLandingScroll enabled />);
  flush();
  expect(scrollTo).toHaveBeenCalledOnce();
});

test("changing to Add funds before navigation settles cancels the pending landing", () => {
  const { scrollTo, flush } = setup();
  render(<WalletLandingScroll />);
  window.history.replaceState({}, "", "/account/wallet?view=history#add-funds");
  flush();
  expect(scrollTo).not.toHaveBeenCalled();
});

test("returning to the balance anchor works without remounting", () => {
  const { scrollTo, flush } = setup({ hash: "#transactions" });
  render(<WalletLandingScroll />);
  window.history.replaceState({}, "", "/account/wallet?view=history#balance");
  act(() => window.dispatchEvent(new HashChangeEvent("hashchange")));
  flush();
  expect(scrollTo).toHaveBeenCalledOnce();
});

test("unmount cancels queued scrolls and removes its navigation listener", () => {
  const { scrollTo, flush, frames } = setup();
  const view = render(<WalletLandingScroll />);
  expect(frames.size).toBe(1);
  view.unmount();
  act(() => window.dispatchEvent(new HashChangeEvent("hashchange")));
  flush();
  expect(scrollTo).not.toHaveBeenCalled();
  expect(frames.size).toBe(0);
});

test("missing targets do not scroll or throw", () => {
  const { scrollTo, flush, balance } = setup();
  balance.remove();
  render(<WalletLandingScroll />);
  flush();
  expect(scrollTo).not.toHaveBeenCalled();
});

test.each(["", "#ready-rewards"])("mobile gift-card collection lands at Available rewards with hash '%s'", hash => {
  const { scrollTo, flush, balance } = setup({ hash });
  window.history.replaceState({}, "", "/account/wallet" + hash);
  balance.id = "ready-rewards";
  render(<WalletLandingScroll target="ready-rewards" />);
  flush();
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 707, behavior: "auto" });
});

test("reward history links retain their destination instead of jumping to available rewards", () => {
  const { scrollTo, flush, balance } = setup({ hash: "#reward-history" });
  balance.id = "ready-rewards";
  render(<WalletLandingScroll target="ready-rewards" />);
  flush();
  expect(scrollTo).not.toHaveBeenCalled();
});

test("desktop gift-card collection keeps its existing landing", () => {
  const { scrollTo, flush, balance } = setup({ mobile: false });
  balance.id = "ready-rewards";
  render(<WalletLandingScroll target="ready-rewards" />);
  flush();
  expect(scrollTo).not.toHaveBeenCalled();
});

test.each(["", "#reward-history"])("reselecting Gift Cards & Rewards from '%s' reveals the collection again", hash => {
  const { scrollTo, flush, balance } = setup();
  window.history.replaceState({}, "", "/account/wallet" + hash);
  balance.id = "ready-rewards";
  const view = render(<><WalletLandingScroll target="ready-rewards" /><Link href="/account/wallet" onClick={event => event.preventDefault()}>Gift Cards &amp; Rewards</Link></>);
  flush();
  scrollTo.mockClear();
  const link = view.getByRole("link");
  fireEvent.click(link, { ctrlKey: true });
  flush();
  expect(scrollTo).not.toHaveBeenCalled();
  fireEvent.click(link);
  flush();
  expect(window.location.hash).toBe("");
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 707, behavior: "auto" });
});
