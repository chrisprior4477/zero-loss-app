import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { PlaceholderOpportunity } from "@/lib/home/placeholder-data";
import { ProductCard } from "./ProductCard";

vi.mock("next/image", () => ({ default: () => null }));
afterEach(cleanup);

const opportunity: PlaceholderOpportunity = {
  id: "almost-full-card",
  title: "Test reward",
  category: "Gift Cards",
  faceValueLabel: "$100",
  entryPriceLabel: "$1 Entry",
  ticketCapacity: 100,
  ticketsSold: 99,
  status: "closing",
  statusLabel: "Closing soon",
  image: "/test.png",
};

test("an almost-full product card uses white lettering on its red badge", () => {
  render(<ProductCard opportunity={opportunity} />);

  const badge = screen.getByText("Almost full");
  expect(badge.style.background).toBe("rgb(243, 35, 67)");
  expect(badge.style.color).toBe("rgb(255, 255, 255)");
});
