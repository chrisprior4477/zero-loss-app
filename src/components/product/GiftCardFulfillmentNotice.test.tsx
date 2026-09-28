import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test } from "vitest";
import { demoProducts } from "@/lib/catalog/demo-products";
import { GiftCardFulfillmentNotice } from "./GiftCardFulfillmentNotice";

afterEach(cleanup);

test("describes the retailer card instead of direct product delivery", () => {
  render(<GiftCardFulfillmentNotice productTitle={'Samsung 50" M70H Mini LED 4K Smart TV'} retailer="Best Buy" value={400} isGiftCardOffering={false} />);

  expect(screen.getByText(/\$400 Best Buy digital gift card/)).toBeTruthy();
  expect(screen.getByText(/Zero Loss does not ship the Samsung 50" M70H Mini LED 4K Smart TV/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Gift Cards & Rewards" }).getAttribute("href")).toBe("/account/wallet");
  expect(screen.getByText(/online or in store where accepted/)).toBeTruthy();
});

test("gift-card listings retain the wallet-cash distinction without claiming a product ships", () => {
  render(<GiftCardFulfillmentNotice productTitle="$25 Netflix Gift Card" retailer="Netflix" value={25} isGiftCardOffering />);

  expect(screen.getByText(/\$25 Netflix digital gift card/)).toBeTruthy();
  expect(screen.getByText(/not Playable Balance or withdrawable cash/)).toBeTruthy();
  expect(screen.queryByText(/does not ship/)).toBeNull();
});

test("every catalog product and category gets its own retailer and value", () => {
  expect(new Set(demoProducts.map((product) => product.category)).size).toBeGreaterThan(1);

  for (const product of demoProducts) {
    const html = renderToStaticMarkup(
      <GiftCardFulfillmentNotice
        productTitle={product.title}
        retailer={product.retailer}
        value={product.value}
        isGiftCardOffering={/gift card|shopping reward/i.test(product.title)}
      />,
    );
    const page = new DOMParser().parseFromString(html, "text/html");
    expect(page.querySelector("mark")?.textContent, product.slug).toBe(`$${product.value.toLocaleString()} ${product.retailer} digital gift card`);
    expect(page.querySelector('a[href="/account/wallet"]')?.textContent, product.slug).toBe("Gift Cards & Rewards");
  }
});
