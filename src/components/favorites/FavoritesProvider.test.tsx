import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setFavorite: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/favorites/actions", () => ({ setFavorite: mocks.setFavorite }));

import { FavoritesProvider, useFavorites } from "./FavoritesProvider";
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

type Reply = { status: 'saved' | 'removed' | 'error'; message?: string };
function delayedReply() {
  let resolve!: (value: Reply) => void;
  const promise = new Promise<Reply>(finish => { resolve = finish; });
  return { promise, resolve };
}
const secondName = 'PlayStation 5 Slim Model';
const secondSlug = 'playstation-5-slim';
function twoProducts(initialSlugs: string[] = []) {
  return render(<FavoritesProvider initialSlugs={initialSlugs} isSignedIn available>
    <FavoriteButton itemName={productName} itemHref={productHref}/>
    <FavoriteButton itemName={productName} itemHref={productHref}/>
    <FavoriteButton itemName={secondName} itemHref={`/items/${secondSlug}`}/>
  </FavoritesProvider>);
}

test('a quick second product save is accepted and each product unlocks only when its own reply arrives', async () => {
  const first = delayedReply(), second = delayedReply();
  mocks.setFavorite.mockImplementation((slug: string) => slug === secondSlug ? second.promise : first.promise);
  twoProducts();
  fireEvent.click(screen.getAllByRole('button', { name: `Add ${productName} to favorites` })[0]);
  const other = screen.getByRole('button', { name: `Add ${secondName} to favorites` });
  expect(other).toHaveProperty('disabled', false);fireEvent.click(other);
  expect(mocks.setFavorite).toHaveBeenCalledTimes(2);
  expect(mocks.setFavorite).toHaveBeenCalledWith(secondSlug, true);
  for (const button of screen.getAllByRole('button')) expect(button).toHaveProperty('disabled', true);
  await act(async () => second.resolve({ status: 'saved' }));
  expect(screen.getByRole('button', { name: `Remove ${secondName} from favorites` })).toHaveProperty('disabled', false);
  for (const button of screen.getAllByRole('button', { name: `Add ${productName} to favorites` })) expect(button).toHaveProperty('disabled', true);
  await act(async () => first.resolve({ status: 'saved' }));
  expect(screen.getAllByRole('button', { name: `Remove ${productName} from favorites` })).toHaveLength(2);
  for (const button of screen.getAllByRole('button')) expect(button).toHaveProperty('disabled', false);
});

test('one failed favorite does not cancel another save or leave either product locked', async () => {
  const first = delayedReply(), second = delayedReply();
  mocks.setFavorite.mockImplementation((slug: string) => slug === secondSlug ? second.promise : first.promise);
  twoProducts();
  fireEvent.click(screen.getAllByRole('button', { name: `Add ${productName} to favorites` })[0]);
  fireEvent.click(screen.getByRole('button', { name: `Add ${secondName} to favorites` }));
  await act(async () => { first.resolve({ status: 'error', message: 'Please try again.' }); second.resolve({ status: 'saved' }); });
  expect(screen.getByRole('button', { name: `Remove ${secondName} from favorites` })).toHaveProperty('disabled', false);
  expect(screen.getAllByRole('button', { name: `Add ${productName} to favorites` })).toHaveLength(2);
  mocks.setFavorite.mockResolvedValueOnce({status:'saved'});
  fireEvent.click(screen.getAllByRole('button', { name: `Add ${productName} to favorites` })[0]);
  await screen.findAllByRole('button', { name: `Remove ${productName} from favorites` });
  expect(mocks.setFavorite).toHaveBeenCalledTimes(3);
});

test('two removals retain their own results when replies arrive in reverse order', async () => {
  const first = delayedReply(), second = delayedReply();
  mocks.setFavorite.mockImplementation((slug: string) => slug === secondSlug ? second.promise : first.promise);
  twoProducts(['dyson-v8-cordless-vacuum', secondSlug]);
  fireEvent.click(screen.getAllByRole('button', { name: `Remove ${productName} from favorites` })[0]);
  fireEvent.click(screen.getByRole('button', { name: `Remove ${secondName} from favorites` }));
  await act(async () => second.resolve({ status: 'removed' }));
  await act(async () => first.resolve({ status: 'removed' }));
  expect(screen.getAllByRole('button', { name: `Add ${productName} to favorites` })).toHaveLength(2);
  expect(screen.getByRole('button', { name: `Add ${secondName} to favorites` })).toHaveProperty('disabled', false);
  expect(mocks.setFavorite).toHaveBeenCalledWith(secondSlug, false);
});

function SameEventDoubleTap() {
  const { toggle } = useFavorites();
  return <button onClick={() => { toggle(secondSlug); toggle(secondSlug); }}>Double tap</button>;
}
test('the same product cannot enqueue duplicate writes before the disabled button renders', async () => {
  const reply = delayedReply();mocks.setFavorite.mockReturnValue(reply.promise);
  render(<FavoritesProvider initialSlugs={[]} isSignedIn available><SameEventDoubleTap/></FavoritesProvider>);
  fireEvent.click(screen.getByRole('button',{name:'Double tap'}));
  expect(mocks.setFavorite).toHaveBeenCalledOnce();
  await act(async()=>reply.resolve({status:'saved'}));
});

test('the guest sign-in handoff and another product save are both retained', async () => {
  sessionStorage.setItem('zero-loss-pending-favorite-v1', JSON.stringify({slug:'dyson-v8-cordless-vacuum',savedAt:Date.now()}));
  const first = delayedReply(), second = delayedReply();
  mocks.setFavorite.mockImplementation((slug:string)=>slug===secondSlug?second.promise:first.promise);
  twoProducts();
  expect(screen.getAllByRole('button',{name:`Add ${productName} to favorites`})[0]).toHaveProperty('disabled',true);
  fireEvent.click(screen.getByRole('button',{name:`Add ${secondName} to favorites`}));
  expect(mocks.setFavorite).toHaveBeenCalledTimes(2);
  await act(async()=>{first.resolve({status:'saved'});second.resolve({status:'saved'});});
  expect(sessionStorage.getItem('zero-loss-pending-favorite-v1')).toBeNull();
  expect(screen.getAllByRole('button',{name:`Remove ${productName} from favorites`})).toHaveLength(2);
  expect(screen.getByRole('button',{name:`Remove ${secondName} from favorites`})).toHaveProperty('disabled',false);
});
