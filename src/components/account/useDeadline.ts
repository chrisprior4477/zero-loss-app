"use client";

import { useEffect, useState } from "react";

export function useDeadline(deadline: number) {
  const [expiredDeadline, setExpiredDeadline] = useState<number>();
  useEffect(() => {
    if (!Number.isFinite(deadline)) return;
    let timer: ReturnType<typeof setTimeout>;
    function check() {
      clearTimeout(timer);
      const remaining = deadline - Date.now();
      if (remaining <= 0) setExpiredDeadline(deadline);
      else timer = setTimeout(check, Math.min(remaining, 60_000));
    }
    timer = setTimeout(check, 0);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [deadline]);
  return expiredDeadline === deadline;
}
