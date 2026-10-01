import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setFavorite: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/favorites/actions", () => ({ setFavorite: mocks.setFavorite }));

import { FavoritesProvider } from "./FavoritesProvider";
import { FavoriteButton } from "@/components/ui/FavoriteButton";

const productName = "Dyson V8 Cordless Pet Vacuum";
const productHref = "/items/dyson-v8-cordless-vacuum";

function renderButtons(isSignedIn = true, initialSlugs: string[] = []) {
  render(<FavoritesProvider initialSlugs={initialSlugs} isSignedIn={isSignedIn} available>
    <FavoriteButton itemName={productName} itemHref={productHref} />
    <FavoriteButton itemName={productName} itemHref={productHref} />
  </FavoritesProvider>);
}

beforeEach(() => {
  mocks.push.mockReset();
  mocks.setFavorite.mockReset();
  sessionStorage.clear();
});
afterEach(cleanup);

test("one save or removal updates every heart for that product", async () => {
  mocks.setFavorite.mockResolvedValueOnce({ status: "saved" }).mockResolvedValueOnce({ status: "removed" });
  renderButtons();
  fireEvent.click(screen.getAllByRole("button", { name: `Add ${productName} to favorites` })[0]);
  await waitFor(() => expect(screen.getAllByRole("button", { name: `Remove ${productName} from favorites` })).toHaveLength(2));
  expect(mocks.setFavorite).toHaveBeenCalledWith("dyson-v8-cordless-vacuum", true);
  fireEvent.click(screen.getAllByRole("button", { name: `Remove ${productName} from favorites` })[1]);
  await waitFor(() => expect(screen.getAllByRole("button", { name: `Add ${productName} to favorites` })).toHaveLength(2));
  expect(mocks.setFavorite).toHaveBeenLastCalledWith("dyson-v8-cordless-vacuum", false);
});

test("failed save leaves the heart unchanged and reports the problem", async () => {
  mocks.setFavorite.mockResolvedValue({ status: "error", message: "Favorites could not be updated." });
  renderButtons();
  fireEvent.click(screen.getAllByRole("button", { name: `Add ${productName} to favorites` })[0]);
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Favorites could not be updated."));
  expect(screen.getAllByRole("button", { name: `Add ${productName} to favorites` })).toHaveLength(2);
});

test("guest favorite tap requests sign-in without pretending to save", () => {
  renderButtons(false);
  fireEvent.click(screen.getAllByRole("button", { name: `Sign in to save ${productName} to favorites` })[0]);
  expect(mocks.push).toHaveBeenCalledWith("/login?next=%2Faccount%2Ffavorites");
  expect(mocks.setFavorite).not.toHaveBeenCalled();
  expect(JSON.parse(sessionStorage.getItem("zero-loss-pending-favorite-v1") ?? "{}").slug).toBe("dyson-v8-cordless-vacuum");
});
