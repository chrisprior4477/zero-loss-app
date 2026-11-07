import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MyZeroLossGallery } from "./MyZeroLossGallery";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { activityViewReturnKey } from "@/lib/account/activity-view-return";

vi.mock("next/image", () => ({ default: () => <span /> }));
beforeEach(() => {
  window.history.replaceState({ framework: "preserved" }, "", "/account/entries?filter=completion");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });
const props = () => ({ ownerId: "me", items: storedActivityFixture().activity, filter: "completion" as const, metricsBySlug: {} });

test("opening a later activity ticket bookmarks and restores its gallery position", async () => {
  const page = render(<MyZeroLossGallery {...props()} />);
  const rail = screen.getByRole("region", { name: "Your products" });
  rail.scrollLeft = 650;
  const card = rail.querySelector<HTMLAnchorElement>("a[data-activity-return-key]")!;
  fireEvent.click(card);
  expect(window.history.state).toMatchObject({ framework: "preserved", [activityViewReturnKey]: {
    ownerId: "me", filter: "completion", key: card.dataset.activityReturnKey, left: 650,
  } });
  page.unmount();
  render(<MyZeroLossGallery {...props()} />);
  await waitFor(() => expect(screen.getByRole("region", { name: "Your products" }).scrollLeft).toBe(650));
});

test.each(["other account", "different filter", "different URL", "removed record"])("does not restore an activity position for %s", async reason => {
  const p = props();
  window.history.replaceState({ [activityViewReturnKey]: {
    ownerId: reason === "other account" ? "another" : "me", href: reason === "different URL" ? "https://other.test/" : window.location.href,
    filter: reason === "different filter" ? "all" : "completion", key: reason === "removed record" ? "removed" : "active:playstation-5-slim",
    left: 650, scrollY: 0, cardTop: 0, width: 1440,
  } }, "");
  render(<MyZeroLossGallery {...p} />);
  expect(screen.getByRole("region", { name: "Your products" }).scrollLeft).toBe(0);
  expect(window.scrollTo).not.toHaveBeenCalled();
});

test("opening a new tab does not replace the current activity return bookmark", () => {
  render(<MyZeroLossGallery {...props()} />);
  fireEvent.click(screen.getByRole("region", { name: "Your products" }).querySelector("a")!, { ctrlKey: true });
  expect(window.history.state).toEqual({ framework: "preserved" });
});
