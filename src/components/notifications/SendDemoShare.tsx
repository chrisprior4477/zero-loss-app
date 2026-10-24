"use client";
import { useRef, useState } from "react";
import { sendDemoShare } from "@/lib/sharing/demo-share-action";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/account/notification-events";
import { useNotifications } from "./NotificationProvider";

export function SendDemoShare() {
  const notifications = useNotifications();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const request = useRef<string | null>(null);
  async function send() {
    if (busy) return;
    setBusy(true); setMessage("");
    request.current ??= crypto.randomUUID();
    try {
      const result = await sendDemoShare(request.current);
      setMessage(result.message);
      if (result.ok) {
        request.current = null;
        if (result.notification) notifications?.receiveConfirmed(result.notification, Boolean(result.isRead));
        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
      }
    } catch { setMessage("We couldn’t confirm your demo share. Try again safely."); }
    finally { setBusy(false); }
  }
  return <><button type="button" disabled={busy} onClick={() => void send()} className="text-left text-[10px] leading-tight text-white/58 hover:text-cyan-300 sm:text-[11px]">{busy ? "Sending…" : "Send demo share"}</button>{message ? <p role="status" className="mt-2 text-xs leading-5 text-cyan-200">{message}</p> : null}</>;
}
