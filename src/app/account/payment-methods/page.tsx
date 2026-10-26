import { redirect } from "next/navigation";

/** Retain old links while keeping cards inside the Playable Wallet. */
export default function PaymentMethodsPage() {
  return redirect("/account/wallet?view=history&panel=cards#wallet-content");
}
