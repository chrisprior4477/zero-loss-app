import { parseDemoCardArtwork, type DemoCard } from "./demo-card";

/** Compare only the choices included in the reviewed save. */
export function cardSaveMatches(card: DemoCard, request: FormData): boolean {
  if (card.token !== request.get("paymentMethod")) return false;
  if (request.has("makeDefault") && card.isDefault !== (request.get("makeDefault") === "true")) return false;
  if (request.has("makeDepositDefault") && (card.isDepositDefault ?? card.isDefault) !== (request.get("makeDepositDefault") === "true")) return false;
  if (!request.has("artwork")) return true;
  const expected = parseDemoCardArtwork(JSON.parse(String(request.get("artwork"))));
  return Boolean(expected && card.artwork && JSON.stringify(expected) === JSON.stringify(card.artwork));
}
