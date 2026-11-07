import { expect, test, vi } from "vitest";
import { readOwnCrewEntries, readOwnCrewShares } from "./own-entries";

test.each(["entries", "shares"] as const)("loads %s beyond the API page, without hiding old sharing controls", async kind => {
  const idKey = kind === "entries" ? "id" : "entry_id";
  const first = Array.from({ length: 500 }, (_, i) => ({ [idKey]: `id${i}`, created_at: "2026-11-01" }));
  const tail = [{ [idKey]: "old-shared-entry", created_at: "2025-01-01" }];
  const results = [{ data: first, error: null }, { data: tail, error: null }];
  const gt = vi.fn();
  const ownerCheck = vi.fn();
  const db = { rpc: vi.fn(async () => results.shift()), from: vi.fn(() => { const result = results.shift(); const query = { select: () => query, eq: (...args: unknown[]) => { ownerCheck(...args); return query; }, order: () => query, limit: () => query, gt: (...args: unknown[]) => { gt(...args); return query; }, then: (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve) }; return query; }) };
  const client = db as unknown as Parameters<typeof readOwnCrewEntries>[0];
  const loaded = kind === "entries" ? await readOwnCrewEntries(client, "owner") : await readOwnCrewShares(client);
  expect(loaded.data).toHaveLength(501);
  if (kind === "entries") {
    expect(gt).toHaveBeenCalledWith(idKey, "id499");
    expect(ownerCheck).toHaveBeenCalledWith("customer_id", "owner");
  } else {
    expect(db.rpc.mock.calls).toEqual([["get_own_crew_shares", { p_after: null }], ["get_own_crew_shares", { p_after: "id499" }]]);
    expect(db.from).not.toHaveBeenCalled();
  }
});
