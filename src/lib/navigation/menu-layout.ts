export const menuLayouts = [
  { id: "classic", name: "Classic", rows: "3 rows", description: "Menu, search, and shopping categories stay together at the top." },
  { id: "ending-search", name: "Ending Soon & search", rows: "2 rows", description: "Search slides across Ending Soon when you tap it." },
  { id: "home-ending-search", name: "Home, Ending Soon & search", rows: "2 rows", description: "Keep Home close by. Search slides across the second row." },
  { id: "search-down", name: "Search push down", rows: "1 row", description: "Tap Search to open a row underneath. Press Go and it folds away." },
  { id: "search-down-browse", name: "Search push down with Ending Soon & Browse", rows: "1 row", description: "Tap Search to reveal search, with Ending Soon and Browse underneath. Choose a destination or tap outside to fold it away." },
  { id: "search-over", name: "Search in place", rows: "1 row", description: "Search opens across the top menu. Press Go to reveal the menu again." },
] as const;

export type MenuLayout = (typeof menuLayouts)[number]["id"];
export function isMenuLayout(value: unknown): value is MenuLayout {
  return menuLayouts.some(layout => layout.id === value);
}
export function menuLayoutOrClassic(value: unknown): MenuLayout {
  return isMenuLayout(value) ? value : "classic";
}

/** Category browsing belongs on shopping pages, ahead of their breadcrumbs. */
export function showsShoppingCategories(pathname: string) {
  return pathname === "/" || pathname === "/browse" || pathname.startsWith("/items/")
    || pathname.startsWith("/rewards/") || pathname === "/account/favorites";
}
