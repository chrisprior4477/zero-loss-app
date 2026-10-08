import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { DrawerOverview } from "./DrawerOverview";

afterEach(cleanup);

test("the drawer wallet ticket links to funding without showing Delete Funds", () => {
  render(<DrawerOverview state={storedActivityFixture()} balanceLabel="$17.50" fundingEnabled onNavigate={vi.fn()} />);
  expect(screen.getByRole("link", { name: "Playable Wallet: $17.50" }).getAttribute("href")).toBe("/account/wallet?view=history");
  expect(screen.getByRole("link", { name: "Add funds" }).getAttribute("href")).toBe("/account/wallet?view=history#add-funds");
  expect(screen.queryByRole("button", { name: "Delete Funds" })).toBeNull();
});
