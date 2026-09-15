import Image from "next/image";
import Link from "next/link";

export function ProfileShortcut({ fullName, initials, avatarUrl, onNavigate }: {
  fullName: string; initials: string; avatarUrl: string | null; onNavigate?: () => void;
}) {
  return <Link href="/account/profile" onClick={onNavigate} aria-label={`Open ${fullName}'s account`} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.06] focus-visible:outline-2 focus-visible:outline-cyan-300">
    <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-cyan-300/40 bg-[#07533f] text-sm font-black text-[#72ff9f]">
      {avatarUrl ? <Image src={avatarUrl} alt="" fill unoptimized sizes="44px" className="object-cover" /> : <span aria-hidden="true">{initials}</span>}
    </span>
    <span className="min-w-0 flex-1"><strong className="block text-sm text-white">Your account</strong><span className="mt-1 block break-words text-xs text-[#b5cce4]">{fullName}</span><span className="mt-1 block text-xs text-[#b5cce4]">Profile & photo</span></span>
    <span className="text-xl text-cyan-300" aria-hidden="true">›</span>
  </Link>;
}
