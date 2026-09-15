import { expect, test } from "vitest";
import { drawerState } from "./drawer-state";

test("normal account receives no fixture data", () => {
  expect(drawerState(false, true)).toMatchObject({ activity: [], activeCount: 0, isPreview: false });
});
test("the private-looking URL does not authorize an ordinary account", () => {
  expect(drawerState(false, true)).toMatchObject({ activity: [], isPreview: false });
});
test("authorized preview uses catalog products and one sample active entry", () => {
  const state = drawerState(true, true);
  expect(state.activeCount).toBe(1);
  expect(state.activity).toHaveLength(4);
  expect(state.activity[2]).toMatchObject({ title: "Baby's Essentials Bundle", remainingCents: 9900, paidCents: 100 });
  expect(state.activity[3]).toMatchObject({ title: 'Samsung 50" M70H Mini LED 4K Smart TV', remainingCents: 39900 });
  expect(state).not.toHaveProperty("balance");
});
test("a failed or nonempty snapshot never invents a zero ticket count", () => {
  expect(drawerState(false, false)).toMatchObject({ activeCount: null, source: "unavailable" });
});
