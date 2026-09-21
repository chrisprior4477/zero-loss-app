import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
vi.mock("@/lib/account/context", () => ({ getAccountContext: async () => { throw new Error("unavailable"); } }));
import FaqPage from "./page";
afterEach(cleanup);
test("public FAQs remain usable when account services are unavailable", async () => {
  render(await FaqPage());
  expect(screen.getByRole("heading", { name: "Frequently asked questions" })).toBeTruthy();
  expect(screen.getByRole("searchbox")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Contact us →" }).getAttribute("href")).toBe("/contact#message");
});
