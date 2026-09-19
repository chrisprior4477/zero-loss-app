import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { livePulseDemoItems, socialActivityDemoItems } from "@/lib/home/demo-data";
import { footerLinkGroups } from "@/lib/navigation";
import { TransparencyStatsPod } from "./TransparencyStatsPod";

afterEach(cleanup);

describe("homepage preview integrity", () => {
  test("does not present fabricated activity counts as live information", () => {
    expect(livePulseDemoItems).toHaveLength(3);
    expect(livePulseDemoItems.map((item) => item.value)).toEqual([
      "Best Buy",
      "Dick's Sporting Goods",
      "Walmart",
    ]);
  });

  test("does not publish sample winner and fulfillment totals", () => {
    render(<TransparencyStatsPod />);

    expect(screen.getByText("Platform totals aren’t published in this preview")).toBeTruthy();
    expect(screen.queryByText("18,402")).toBeNull();
    expect(screen.queryByText("$1,248,650")).toBeNull();
    expect(screen.queryByText("$386,940")).toBeNull();
  });

  test("winner links lead to the existing homepage section", () => {
    const marketplaceLinks = footerLinkGroups.find((group) => group.title === "Marketplace")?.links;
    expect(marketplaceLinks?.find((link) => link.label === "Winners")?.href).toBe("/#meet-winners-heading");
    expect(socialActivityDemoItems.filter((item) => item.id === "social-facebook-1" || item.id === "social-tiktok-2").map((item) => item.href)).toEqual([
      "/#meet-winners-heading",
      "/#meet-winners-heading",
    ]);
  });
});
