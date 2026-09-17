import { expect, test } from "vitest";
import { drawerState } from "./drawer-state";

test("verified customer data produces an honest empty state", () => {
  expect(drawerState(true)).toMatchObject({
    activity: [], activeCount: 0, isPreview: false, source: "customer-empty",
  });
});
test("failed account data is unavailable rather than a fixture or invented zero", () => {
  expect(drawerState(false)).toMatchObject({
    activity: [], activeCount: null, isPreview: false, source: "unavailable",
  });
});
