import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FaqExplorer } from "./FaqExplorer";
import { faqItems } from "@/lib/help/faq";
afterEach(cleanup);

test("all questions begin collapsed and search shows matching answers without another click", () => {
  const { container } = render(<FaqExplorer />);
  expect(container.querySelectorAll("details")).toHaveLength(faqItems.length);
  expect(container.querySelector("details[open]")).toBeNull();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "kyc" } });
  expect(container.querySelectorAll("details")).toHaveLength(1);
  expect(container.querySelector("details")?.open).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("1 answer");
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(container.querySelectorAll("details")).toHaveLength(faqItems.length);
  expect(container.querySelector("details[open]")).toBeNull();
});
test("topics filter in place, zero results recover, and support always has a destination", () => {
  render(<FaqExplorer />);
  fireEvent.click(screen.getByRole("button", { name: "Wallet & funding" }));
  expect(screen.getByRole("button", { name: "Wallet & funding" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "unmatched-phrase" } });
  expect(screen.getByRole("link", { name: "Contact support →" }).getAttribute("href")).toBe("/contact#message");
  fireEvent.click(screen.getByRole("button", { name: "Show all questions" }));
  expect(screen.getByRole("searchbox")).toHaveProperty("value", "");
  expect(screen.getByRole("button", { name: "All questions" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("status").textContent).toContain(`${faqItems.length} answers`);
});
