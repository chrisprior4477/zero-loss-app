type EndingSoonCard = { item: { href?: string }; remaining: number };

/** Keep the founder's walkthrough sequence together when all three offers are open. */
export function placeEndingSoonShowcases<T extends EndingSoonCard>(cards: T[]): T[] {
  const openCards = cards.filter(card => card.remaining > 0);
  const baby = openCards.find(({ item }) => item.href === "/items/babys-essentials-bundle");
  const dunkin = openCards.find(({ item }) => item.href === "/items/dunkin-25-gift-card");
  const walmart = openCards.find(({ item }) => item.href === "/items/walmart-100-gift-card");
  const bestBuy = openCards.find(({ item }) => item.href === "/items/best-buy-100-gift-card");
  if (!baby || !dunkin || !walmart) return openCards;

  const ordered = openCards.filter(card => card !== dunkin && card !== walmart && card !== bestBuy);
  ordered.splice(ordered.indexOf(baby) + 1, 0, dunkin, walmart,
    ...(bestBuy ? [bestBuy] : []));
  return ordered;
}
