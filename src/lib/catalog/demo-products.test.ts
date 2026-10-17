import { expect, test } from "vitest";
import { placeholderDiscoveryOpportunities } from "@/lib/home/placeholder-data";
import { getDemoProduct } from "./demo-products";

test("future Lowe's demo entries are advertised at one dollar", () => {
  expect(getDemoProduct("lowes-150-gift-card")?.entryPrice).toBe(1);
  expect(placeholderDiscoveryOpportunities.find(item => item.href === "/items/lowes-150-gift-card")?.entryPriceLabel).toBe("$1 Entry");
});
