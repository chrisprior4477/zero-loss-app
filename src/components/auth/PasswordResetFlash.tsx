"use client";

import { useEffect } from "react";
import { passwordResetFlashName, passwordResetFlashPath } from "@/lib/auth/password-reset-flash";

export function PasswordResetFlash() {
  useEffect(() => {
    // This presentation cookie carries no authentication or recovery data.
    document.cookie = `${passwordResetFlashName}=; Max-Age=0; Path=${passwordResetFlashPath}; SameSite=Lax`;
    const url = new URL(window.location.href);
    url.searchParams.delete("updated");
    window.history.replaceState(window.history.state, "", url);
  }, []);
  return null;
}
