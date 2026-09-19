import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { livePulseDemoItems, recentWinnerDemoItems, socialActivityDemoItems, transparencyStatsDemo } from "@/lib/home/demo-data";
import { footerLinkGroups } from "@/lib/navigation";
import { TransparencyStatsPod } from "./TransparencyStatsPod";

afterEach(cleanup);

describe("homepage preview integrity", () => {
  test("retains the sample ticker for the working MVP", () => {
    expect(livePulseDemoItems).toHaveLength(8);
    expect(livePulseDemoItems).toContainEqual({ label: "193 winners", value: "TODAY!", tone: "live" });
    expect(livePulseDemoItems).toContainEqual({ label: "Active prize pools", value: "142", tone: "neutral" });
  });

  test("retains labeled sample winner and fulfillment totals", () => {
    render(<TransparencyStatsPod />);

    expect(screen.getByText("Sandbox / Sample Data")).toBeTruthy();
    expect(transparencyStatsDemo).toHaveLength(4);
    expect(screen.getByText("18,402")).toBeTruthy();
    expect(screen.getByText("$1,248,650")).toBeTruthy();
    expect(screen.getByText("$386,940")).toBeTruthy();
  });

  test("winner links lead to the existing homepage section", () => {
    const marketplaceLinks = footerLinkGroups.find((group) => group.title === "Marketplace")?.links;
    expect(marketplaceLinks?.find((link) => link.label === "Winners")?.href).toBe("/#meet-winners-heading");
    expect(socialActivityDemoItems.filter((item) => item.id === "social-facebook-1" || item.id === "social-tiktok-2").map((item) => item.href)).toEqual([
      "/#meet-winners-heading",
      "/#meet-winners-heading",
    ]);
  });

  test("the sample Walmart winner opens the Walmart item", () => {
    const href = recentWinnerDemoItems.find((item) => item.name === "Tim M.")?.href;
    expect(href).toBe("/items/walmart-100-gift-card");
    expect(getDemoProduct(href!.slice("/items/".length))?.retailer).toBe("Walmart");
  });
});
