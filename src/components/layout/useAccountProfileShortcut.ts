"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

/** A hold is a shortcut only; taps and keyboard activation still open the drawer. */
export function useAccountProfileShortcut(enabled: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const cancelHold = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    gesture.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("blur", cancelHold);
    return () => {
      cancelHold();
      window.removeEventListener("blur", cancelHold);
    };
  }, [enabled, pathname, cancelHold]);

  return {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      cancelHold();
      suppressClick.current = false;
      if (!enabled || event.button !== 0 || event.isPrimary === false) return;
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        timer.current = null;
        suppressClick.current = true;
        router.push("/account/profile#profile-intro");
      }, 600);
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const start = gesture.current;
      if (start && start.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancelHold();
    },
    onPointerUp: cancelHold,
    onPointerLeave: cancelHold,
    onPointerCancel: cancelHold,
    onBlur: cancelHold,
    onClickCapture(event: MouseEvent<HTMLButtonElement>) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    onContextMenu(event: MouseEvent<HTMLButtonElement>) {
      if (enabled) event.preventDefault();
    },
    onKeyDown() { suppressClick.current = false; },
  };
}
