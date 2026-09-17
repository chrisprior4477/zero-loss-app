/** A simulator fixture, not a token issued by a real payment processor. */
export const DEMO_CARD_TOKEN = "demo_card_4242";
export type DemoCard = { token: typeof DEMO_CARD_TOKEN; lastFour: "4242"; isDefault: boolean };

export function parseDemoCard(value: unknown): DemoCard | null {
  if (value === null) return null;
  if (typeof value !== "object" || !value || !("token" in value) || value.token !== DEMO_CARD_TOKEN
    || !("lastFour" in value) || value.lastFour !== "4242" || !("isDefault" in value) || typeof value.isDefault !== "boolean") {
    throw new Error("Payment method unavailable");
  }
  return { token: DEMO_CARD_TOKEN, lastFour: "4242", isDefault: value.isDefault };
}
