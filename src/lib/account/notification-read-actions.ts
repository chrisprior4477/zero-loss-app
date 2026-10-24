"use server";

import { revalidatePath } from "next/cache";
import { storeNotificationReads } from "./notification-read-store";

type ReadResult = { ok: boolean; message: string };

export async function markNotificationsRead(ids: string[]): Promise<ReadResult> {
  const result = await storeNotificationReads(ids);
  if (result.ok) revalidatePath("/account/notifications");
  return { ok: result.ok, message: result.message };
}
