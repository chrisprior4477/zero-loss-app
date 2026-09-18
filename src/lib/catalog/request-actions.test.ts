import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { submitCatalogRequest } from "./request-actions";

function requestForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("requestedItem", overrides.requestedItem ?? "Kayak");
  form.set("email", overrides.email ?? "customer@example.com");
  form.set("notes", overrides.notes ?? "A tandem option would be great.");
  form.set("sourceQuery", overrides.sourceQuery ?? "kayak");
  return form;
}

describe("catalog product request action", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.createClient.mockReset();
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
  });

  test("rejects invalid requests before database access", async () => {
    const result = await submitCatalogRequest({ status: "idle" }, requestForm({ requestedItem: "x" }));
    expect(result.status).toBe("error");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  test("stores a valid request through the protected RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: "request-id", error: null });
    const result = await submitCatalogRequest({ status: "idle" }, requestForm());

    expect(result.status).toBe("succeeded");
    expect(mocks.rpc).toHaveBeenCalledWith("submit_catalog_request", {
      p_email: "customer@example.com",
      p_requested_item: "Kayak",
      p_notes: "A tandem option would be great.",
      p_source_query: "kayak",
    });
  });

  test("shows the database rate-limit message", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "We saved your recent requests. Please try again tomorrow." } });
    const result = await submitCatalogRequest({ status: "idle" }, requestForm());
    expect(result).toEqual({ status: "error", message: "We saved your recent requests. Please try again tomorrow." });
  });
});
