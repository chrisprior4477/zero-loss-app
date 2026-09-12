"use client";

import { usePathname, useRouter } from "next/navigation";
import { accountHref, accountModeFromPath, accountSectionFromPath } from "@/lib/account/mode";

export function AccountModeSwitch({ isSignedIn }: { isSignedIn: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const mode = accountModeFromPath(pathname);
  const section = accountSectionFromPath(pathname);

  function changeMode(nextMode: "live" | "demo") {
    window.localStorage.setItem("zero-loss-account-mode", nextMode);
    if (nextMode === "demo") {
      router.push(accountHref("demo", section));
      return;
    }

    router.push(isSignedIn ? accountHref("live", section) : "/");
  }

  return (
    <div className="absolute left-1/2 top-full z-20 -translate-x-1/2">
      <div className="flex overflow-hidden rounded-b-2xl border-x border-b border-cyan-300/35 bg-[#00142d] p-1 shadow-[0_8px_20px_rgba(0,0,0,.28)]" role="group" aria-label="Account data mode">
        <button
          type="button"
          aria-pressed={mode === "live"}
          onClick={() => changeMode("live")}
          className={`min-h-9 rounded-xl px-4 text-xs font-black uppercase tracking-[0.1em] transition ${mode === "live" ? "bg-[#31e800] text-[#002719]" : "text-white/55 hover:text-white"}`}
        >
          Live
        </button>
        <button
          type="button"
          aria-pressed={mode === "demo"}
          onClick={() => changeMode("demo")}
          className={`min-h-9 rounded-xl px-4 text-xs font-black uppercase tracking-[0.1em] transition ${mode === "demo" ? "bg-cyan-300 text-[#00132e]" : "text-white/55 hover:text-white"}`}
        >
          Demo
        </button>
      </div>
    </div>
  );
}
