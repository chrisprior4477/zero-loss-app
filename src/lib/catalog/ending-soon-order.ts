type EndingSoonCard = { item: { href?: string }; remaining: number };

/** Keep the founder's walkthrough sequence together when all three offers are open. */
export function placeEndingSoonShowcases<T extends EndingSoonCard>(cards: T[]): T[] {
  const baby = cards.find(({ item }) => item.href === "/items/babys-essentials-bundle");
  const dunkin = cards.find(({ item }) => item.href === "/items/dunkin-25-gift-card");
  const walmart = cards.find(({ item }) => item.href === "/items/walmart-100-gift-card");
  const bestBuy = cards.find(({ item }) => item.href === "/items/best-buy-100-gift-card");
  if (!baby || !dunkin || !walmart || [baby, dunkin, walmart].some(card => card.remaining === 0)) return cards;

  const ordered = cards.filter(card => card !== dunkin && card !== walmart && card !== bestBuy);
  ordered.splice(ordered.indexOf(baby) + 1, 0, dunkin, walmart,
    ...(bestBuy && bestBuy.remaining > 0 ? [bestBuy] : []));
  if (bestBuy && bestBuy.remaining === 0) ordered.push(bestBuy);
  return ordered;
}
