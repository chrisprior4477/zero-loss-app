export function checkoutAttemptKey(ownerId: string, slug: string) {
  return `zero-loss-checkout-attempt:${ownerId}:${slug}`;
}
