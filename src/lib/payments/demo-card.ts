/** A simulator fixture, not a token issued by a real payment processor. */
export const DEMO_CARD_TOKEN = "demo_card_4242";
export const DEMO_CARD_FIXTURES = [
  { token: "demo_card_4242", lastFour: "4242", number: "4242 4242 4242 4242", expiry: "12/30", code: "123" },
  { token: "demo_card_5556", lastFour: "5556", number: "5555 5555 5555 5556", expiry: "11/30", code: "456" },
  { token: "demo_card_1881", lastFour: "1881", number: "4000 0000 0000 1881", expiry: "10/30", code: "789" },
  { token: "demo_card_0002", lastFour: "0002", number: "4000 0000 0000 0002", expiry: "09/30", code: "321" },
] as const;
export type DemoCardToken = (typeof DEMO_CARD_FIXTURES)[number]["token"];
export type DemoCard = { token: DemoCardToken; lastFour: string; isDefault: boolean };

export function demoCardFixture(token: unknown) {
  return DEMO_CARD_FIXTURES.find(card => card.token === token);
}

export function parseDemoCard(value: unknown): DemoCard | null {
  if (value === null) return null;
  if (typeof value !== "object" || !value || !("token" in value) || !demoCardFixture(value.token)
    || !("lastFour" in value) || value.lastFour !== demoCardFixture(value.token)?.lastFour || !("isDefault" in value) || typeof value.isDefault !== "boolean") {
    throw new Error("Payment method unavailable");
  }
  return { token: value.token as DemoCardToken, lastFour: value.lastFour as string, isDefault: value.isDefault };
}

export function parseDemoCards(value: unknown): DemoCard[] {
  if (!Array.isArray(value)) throw new Error("Payment methods unavailable");
  const cards = value.map(parseDemoCard);
  if (cards.some(card => !card) || new Set(cards.map(card => card?.token)).size !== cards.length
    || cards.filter(card => card?.isDefault).length > 1) throw new Error("Invalid payment methods");
  return cards as DemoCard[];
}
