// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";
import { getGiftCardPartnerGroups } from "./gift-card-partners-reader";

const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: () => ({ select: () => ({ limit: read }) }) }) }));
beforeEach(() => vi.resetAllMocks());

test("stored legacy Ube rows display Uber without changing offer identity or repeating the partner", async () => {
  read.mockResolvedValue({ data: [
    { provider_category: "Travel & Entertainment", brand_name: "Ube" },
    { provider_category: "Travel & Entertainment", brand_name: "Uber" },
    { provider_category: "Travel & Entertainment", brand_name: "Uber Eats" },
  ], error: null });
  expect(await getGiftCardPartnerGroups()).toEqual([{ category: "Travel & Entertainment", brands: ["Uber", "Uber Eats"] }]);
});

test("fallback directory also uses Uber when the partner lookup is unavailable", async () => {
  read.mockResolvedValue({ data: null, error: { message: "Unavailable" } });
  const brands = (await getGiftCardPartnerGroups()).flatMap(group => group.brands);
  expect(brands).toContain("Uber");
  expect(brands).not.toContain("Ube");
});
