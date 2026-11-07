/** Repack visible products so every compact column contains two different cards. */
export function marketplaceColumns<T extends { href: string }>(available: readonly T[]): T[][] {
  const items = [...new Map(available.map(item => [item.href, item])).values()];
  const columns: T[][] = [];
  for (let i = 0; i < items.length; i += 3) {
    columns.push([items[i]]);
    if (i + 1 < items.length) columns.push(items.slice(i + 1, i + 3));
  }
  return columns;
}
