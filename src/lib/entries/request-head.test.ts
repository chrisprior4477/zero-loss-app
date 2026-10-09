import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, test, vi } from "vitest";
import { getEntryRequestHead } from "./request-head";

function reader(result: { data: { id: string } | null; error: unknown }) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  const from = vi.fn().mockReturnValue(query);
  return { db: { from } as unknown as SupabaseClient, from, query };
}

test("reads only the authenticated owner's latest prize request as the compare token", async () => {
  const requestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const { db, from, query } = reader({ data: { id: requestId }, error: null });
  expect(await getEntryRequestHead(db, "playstation-5-slim")).toEqual({ ready: true, requestId });
  expect(from).toHaveBeenCalledWith("entry_requests");
  expect(query.select).toHaveBeenCalledWith("id");
  expect(query.eq).toHaveBeenCalledWith("offering_slug", "playstation-5-slim");
  expect(query.order).toHaveBeenNthCalledWith(1, "requested_at", { ascending: false });
  expect(query.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
  expect(query.limit).toHaveBeenCalledWith(1);
});

test("a first prize has no previous request, while a failed or malformed read blocks checkout", async () => {
  expect(await getEntryRequestHead(reader({ data: null, error: null }).db, "first-prize"))
    .toEqual({ ready: true, requestId: null });
  expect(await getEntryRequestHead(reader({ data: null, error: { code: "42501" } }).db, "first-prize"))
    .toEqual({ ready: false, requestId: null });
  expect(await getEntryRequestHead(reader({ data: { id: "not-a-request" }, error: null }).db, "first-prize"))
    .toEqual({ ready: false, requestId: null });
});
