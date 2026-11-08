import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const submit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/catalog/request-actions", () => ({ submitCatalogRequest: submit }));
import { CatalogRequestForm } from "./CatalogRequestForm";
import { catalogRequestDraftKey } from "@/lib/catalog/request-draft";
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test.each(["validation", "connection"])("%s failure preserves the full request draft for correction and retry", async kind => {
  if (kind === "validation") submit.mockResolvedValueOnce({ status: "error", message: "Check the product name" });
  else submit.mockRejectedValueOnce(new Error("Connection lost"));
  submit.mockResolvedValueOnce({ status: "succeeded", message: "Saved request" });
  render(<CatalogRequestForm initialProduct="Kayak" />);
  fireEvent.change(screen.getByLabelText(/What would you like/), { target: { value: "  " } });
  fireEvent.change(screen.getByLabelText("Email", { exact: true }), { target: { value: "person@example.test" } });
  fireEvent.change(screen.getByLabelText(/Anything else/), { target: { value: "Keep these brand and size details" } });
  fireEvent.submit(screen.getByRole("button", { name: /Send product request/ }).closest("form")!);
  await screen.findByRole("alert");
  expect(screen.getByLabelText(/What would you like/)).toHaveProperty("value", "  ");
  expect(screen.getByLabelText("Email", { exact: true })).toHaveProperty("value", "person@example.test");
  expect(screen.getByLabelText(/Anything else/)).toHaveProperty("value", "Keep these brand and size details");
  fireEvent.change(screen.getByLabelText(/What would you like/), { target: { value: "Tandem kayak" } });
  fireEvent.submit(screen.getByRole("button", { name: /Send product request/ }).closest("form")!);
  expect(await screen.findByRole("status")).toHaveProperty("textContent", expect.stringContaining("Saved request"));
  const firstKey = (submit.mock.calls[0][1] as FormData).get("requestKey");
  expect(firstKey).toEqual(expect.any(String));
  expect((submit.mock.calls[1][1] as FormData).get("requestKey")).not.toBe(firstKey);
  expect(screen.queryByLabelText("Email", { exact: true })).toBeNull();
  expect(submit.mock.calls[1][1].get("requestedItem")).toBe("Tandem kayak");
  expect(submit.mock.calls[1][1].get("email")).toBe("person@example.test");
  expect(submit.mock.calls[1][1].get("notes")).toBe("Keep these brand and size details");
  expect(submit.mock.calls[1][1].get("sourceQuery")).toBe("Kayak");
});

function editDraft() {
  fireEvent.change(screen.getByLabelText(/What would you like/), { target: { value: "Tandem fishing kayak" } });
  fireEvent.change(screen.getByLabelText("Email", { exact: true }), { target: { value: "person@example.test" } });
  fireEvent.change(screen.getByLabelText(/Anything else/), { target: { value: "Lightweight with room for fishing gear" } });
}

test("navigation away and a fresh mount restore all three fields under the original search", () => {
  const view = render(<CatalogRequestForm initialProduct="Kayaks" ownerId="customer-a" />);
  editDraft(); view.unmount();
  render(<CatalogRequestForm initialProduct="Kayaks" ownerId="customer-a" />);
  expect(screen.getByLabelText(/What would you like/)).toHaveProperty("value", "Tandem fishing kayak");
  expect(screen.getByLabelText("Email", { exact: true })).toHaveProperty("value", "person@example.test");
  expect(screen.getByLabelText(/Anything else/)).toHaveProperty("value", "Lightweight with room for fishing gear");
  expect(submit).not.toHaveBeenCalled();
});

test("changing accounts or searches never shows another draft, including signed-out requests", () => {
  const view = render(<CatalogRequestForm initialProduct="Kayaks" ownerId="customer-a" />); editDraft();
  view.rerender(<CatalogRequestForm initialProduct="Kayaks" ownerId="customer-b" />);
  expect(screen.getByLabelText("Email", { exact: true })).toHaveProperty("value", "");
  view.rerender(<CatalogRequestForm initialProduct="Kayaks" />);
  expect(screen.getByLabelText(/Anything else/)).toHaveProperty("value", "");
  view.rerender(<CatalogRequestForm initialProduct="Bikes" ownerId="customer-a" />);
  expect(screen.getByLabelText(/What would you like/)).toHaveProperty("value", "Bikes");
  view.rerender(<CatalogRequestForm initialProduct="Kayaks" ownerId="customer-a" />);
  expect(screen.getByLabelText("Email", { exact: true })).toHaveProperty("value", "person@example.test");
});

test("Clear draft restores the original search and stays clear after refreshing", () => {
  const view = render(<CatalogRequestForm initialProduct="Kayaks" />); editDraft();
  fireEvent.click(screen.getByRole("button", { name: "Clear draft" }));
  expect(sessionStorage.getItem(catalogRequestDraftKey(undefined, "Kayaks"))).toBeNull();
  view.unmount(); render(<CatalogRequestForm initialProduct="Kayaks" />);
  expect(screen.getByLabelText(/What would you like/)).toHaveProperty("value", "Kayaks");
  expect(screen.getByLabelText("Email", { exact: true })).toHaveProperty("value", "");
  expect(screen.getByLabelText(/Anything else/)).toHaveProperty("value", "");
});

test("a connection error survives remount, while confirmed success removes the remembered draft", async () => {
  submit.mockRejectedValueOnce(new Error("Disconnected"));
  submit.mockResolvedValueOnce({ status: "succeeded", message: "Saved request" });
  const view = render(<CatalogRequestForm initialProduct="Kayaks" ownerId="customer-a" />); editDraft();
  fireEvent.submit(screen.getByRole("button", { name: /Send product request/ }).closest("form")!);
  await screen.findByRole("alert"); view.unmount();
  const returned = render(<CatalogRequestForm initialProduct="Kayaks" ownerId="customer-a" />);
  expect(screen.getByLabelText(/Anything else/)).toHaveProperty("value", "Lightweight with room for fishing gear");
  fireEvent.submit(screen.getByRole("button", { name: /Send product request/ }).closest("form")!);
  await screen.findByRole("status");
  expect(sessionStorage.getItem(catalogRequestDraftKey("customer-a", "Kayaks"))).toBeNull();
  const originalKey = (submit.mock.calls[0][1] as FormData).get("requestKey");
  expect(originalKey).toEqual(expect.any(String));
  expect((submit.mock.calls[1][1] as FormData).get("requestKey")).toBe(originalKey);
  returned.unmount(); render(<CatalogRequestForm initialProduct="Kayaks" ownerId="customer-a" />);
  expect(screen.getByLabelText("Email", { exact: true })).toHaveProperty("value", "");
});

test("blocked browser storage leaves editing and clearing usable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  render(<CatalogRequestForm initialProduct="Kayaks" />); editDraft();
  expect(screen.getByLabelText(/Anything else/)).toHaveProperty("value", "Lightweight with room for fishing gear");
  fireEvent.click(screen.getByRole("button", { name: "Clear draft" }));
  expect(screen.getByLabelText(/Anything else/)).toHaveProperty("value", "");
});
