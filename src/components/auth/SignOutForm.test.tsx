import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { saveEntryIntent } from "@/lib/entries/return-intent";
import { signOutAction } from "@/lib/auth/actions";

vi.mock("@/lib/auth/actions", () => ({ signOutAction: vi.fn() }));

import { SignOutForm } from "./SignOutForm";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.mocked(signOutAction).mockReset();
});

test("sign-out form submits the current product and selected entry count", async () => {
  window.history.replaceState({}, "", "/items/dyson-v8-cordless-vacuum");
  saveEntryIntent("dyson-v8-cordless-vacuum", "Dyson vacuum", 4);
  render(<SignOutForm><button type="submit">Sign out</button></SignOutForm>);
  const form = screen.getByRole("button", { name: "Sign out" }).closest("form")!;
  fireEvent.submit(form);
  expect((form.elements.namedItem("returnTo") as HTMLInputElement).value)
    .toBe("/items/dyson-v8-cordless-vacuum?quantity=4#enter-entry");
  await waitFor(() => expect(vi.mocked(signOutAction).mock.calls[0]?.[0].get("returnTo"))
    .toBe("/items/dyson-v8-cordless-vacuum?quantity=4#enter-entry"));
});

test("sign-out form does not invent a product return elsewhere", () => {
  window.history.replaceState({}, "", "/account/security");
  render(<SignOutForm><button type="submit">Sign out</button></SignOutForm>);
  const form = screen.getByRole("button", { name: "Sign out" }).closest("form")!;
  fireEvent.submit(form);
  expect((form.elements.namedItem("returnTo") as HTMLInputElement).value).toBe("");
});
