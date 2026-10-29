import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/lib/account/context";
import { authNavigationHref } from "@/lib/auth/entry-return";

export const metadata: Metadata = { title: "Payment Methods" };

export default async function PaymentMethodsPage() {
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", "/account/payment-methods"));
  // Existing account-menu links reach the same saved-card manager as the wallet.
  redirect("/account/wallet?view=history&panel=methods");
}
