import { notFound, redirect } from "next/navigation";

const sharedDestinations = {
  entries: "/account/entries",
  orders: "/account/orders",
  wallet: "/account/wallet?view=history",
  notifications: "/account/notifications",
  security: "/account/security",
  results: "/account/results",
  "official-rules": "/free-entry",
} as const;

export default async function LegacyAccountPreviewPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!(section in sharedDestinations)) notFound();
  redirect(sharedDestinations[section as keyof typeof sharedDestinations]);
}
