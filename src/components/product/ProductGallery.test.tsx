import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ProductGallery } from "./ProductGallery";

const favorite = vi.hoisted(() => vi.fn());
vi.mock("@/components/favorites/FavoritesProvider", () => ({ useFavorites: () => ({ slugs: [], isSignedIn: true, busySlug: null, toggle: favorite }) }));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event("close")); };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });

const props = { title: "PlayStation", slug: "playstation-5-slim", gallery: [{ src: "/ps5.png", alt: "PlayStation photo" }, { src: "/ps5-back.png", alt: "PlayStation rear photo" }] };

test.each(["picture", "Product info label"])("the %s opens the same product information and restores focus when closed", target => {
  render(<ProductGallery {...props} compact productInfo={<p>All of this prize’s product information.</p>} />);
  const trigger = screen.getByRole("button", { name: "Product info for PlayStation" });
  fireEvent.click(target === "picture" ? screen.getByAltText("PlayStation photo") : within(trigger).getByText("Product info", { exact: true }));
  expect(screen.getByRole("dialog", { name: "Product info" })).toBeTruthy();
  expect(screen.getByText("All of this prize’s product information.")).toBeTruthy();
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Close product info" }));
  expect(screen.queryByRole("dialog", { name: "Product info" })).toBeNull();
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(trigger);
});

test("gallery selection and favoriting remain independent from the product information trigger", () => {
  render(<ProductGallery {...props} compact productInfo={<p>Product information.</p>} />);
  fireEvent.click(screen.getByRole("button", { name: "Show image 2 of 2" }));
  expect(screen.getByAltText("PlayStation rear photo")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add PlayStation to favorites" }));
  expect(favorite).toHaveBeenCalledWith("playstation-5-slim");
  expect(screen.queryByRole("dialog", { name: "Product info" })).toBeNull();
  fireEvent.click(screen.getByAltText("PlayStation rear photo"));
  expect(screen.getByRole("dialog", { name: "Product info" })).toBeTruthy();
});
