import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FaqExplorer } from "./FaqExplorer";
import { faqItems } from "@/lib/help/faq";
import { faqReturnKey } from "@/lib/help/faq-return";
beforeEach(() => { window.history.replaceState({ framework: "keep" }, "", "/faq"); vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });

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

test("Back restores the funding topic, pending search, and open answers", async () => {
  const page = render(<FaqExplorer />);
  fireEvent.click(screen.getByRole("button", { name: "Wallet & funding" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "pending" } });
  fireEvent.click(screen.getByRole("link", { name: "Check funds & history" }));
  expect(window.history.state).toMatchObject({ framework: "keep", [faqReturnKey]: { query: "pending", category: "wallet", answer: "funding-status" } });
  page.unmount();
  const returned = render(<FaqExplorer />);
  expect(screen.getByRole("searchbox")).toHaveProperty("value", "pending");
  expect(screen.getByRole("button", { name: "Wallet & funding" }).getAttribute("aria-pressed")).toBe("true");
  expect(returned.container.querySelector('[data-faq-id="funding-status"]')).toHaveProperty("open", true);
  await waitFor(() => expect(window.scrollTo).toHaveBeenCalled());
});

test("a different FAQ history entry ignores a previous search bookmark", () => {
  window.history.replaceState({ [faqReturnKey]: { href: "https://other.test/faq", query: "pending", category: "wallet", expanded: [], scrollY: 100, answer: null, answerTop: 0 } }, "");
  render(<FaqExplorer />);
  expect(screen.getByRole("searchbox")).toHaveProperty("value", "");
  expect(screen.getByRole("button", { name: "All questions" }).getAttribute("aria-pressed")).toBe("true");
});


test('search and topic changes after Back survive reload without restoring the old answer', () => {
  let page = render(<FaqExplorer />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pending' } });
  fireEvent.click(screen.getByRole('link', { name: 'Check funds & history' }));
  page.unmount(); page = render(<FaqExplorer />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'password' } });
  expect(window.history.state[faqReturnKey]).toMatchObject({ query: 'password', answer: null });
  page.unmount(); page = render(<FaqExplorer />);
  expect(screen.getByRole('searchbox')).toHaveProperty('value', 'password');
  expect(screen.getByRole('status').textContent).toContain('2 answers');
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  fireEvent.click(screen.getByRole('button', { name: 'Wallet & funding' }));
  page.unmount(); render(<FaqExplorer />);
  expect(screen.getByRole('searchbox')).toHaveProperty('value', '');
  expect(screen.getByRole('button', { name: 'Wallet & funding' }).getAttribute('aria-pressed')).toBe('true');
});
