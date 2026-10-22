import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { WalletRewardLink } from "./WalletRewardLink";

vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); });

function setup(href: string, current = href, target?: string) {
  window.history.replaceState({}, "", current);
  render(<><WalletRewardLink href={href} target={target}>Ready</WalletRewardLink><section id={href.split("#")[1]}>Rewards</section></>);
  const scroll = vi.fn();
  document.getElementById(href.split("#")[1])!.scrollIntoView = scroll;
  return scroll;
}

test.each(["/account/wallet#ready-rewards", "/account/wallet?rewards=ready#ready-rewards", "/account/wallet?rewards=used#reward-history", "/account/wallet?rewards=expired#reward-history"])("reselecting %s reveals its section without reloading", href => {
  const scroll = setup(href);
  expect(fireEvent.click(screen.getByRole("link"), { button: 0 })).toBe(false);
  expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: "start", behavior: "auto" });
});

test("changing filters still follows the normal route and loads its records", () => {
  const scroll = setup("/account/wallet?rewards=ready#ready-rewards", "/account/wallet#ready-rewards");
  expect(fireEvent.click(screen.getByRole("link"), { button: 0 })).toBe(true);
  expect(scroll).not.toHaveBeenCalled();
});

test.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])("preserves modified clicks: %j", modifier => {
  const scroll = setup("/account/wallet#ready-rewards");
  expect(fireEvent.click(screen.getByRole("link"), { button: 0, ...modifier })).toBe(true);
  expect(scroll).not.toHaveBeenCalled();
});

test("preserves an explicit new-tab target", () => {
  const scroll = setup("/account/wallet#ready-rewards", undefined, "_blank");
  expect(fireEvent.click(screen.getByRole("link"), { button: 0 })).toBe(true);
  expect(scroll).not.toHaveBeenCalled();
});
