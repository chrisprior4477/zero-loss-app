import Image from "next/image";

/**
 * The three-photo hero fan from the Checkpoint 2 artboards.
 *
 * The design ships this as a single pre-composed asset per breakpoint rather
 * than three separately positioned slots — the desktop artboard's three
 * image-slots (2a-hero2-left / -center / -right) were never filled, while the
 * composed renders were. Using the composed art keeps the exact overlap,
 * rotation and shadow relationships the design established.
 *
 * On mobile the fan is deliberately WIDER than the content column so the
 * outer two cards run off both edges, as they do in the artboard. It escapes
 * PageContainer's horizontal padding with negative margins and is then scaled
 * past 100%, so the left and right cards crop at the screen edge instead of
 * being letterboxed inside the column.
 *
 * The bleed is clipped by `overflow-hidden` rather than allowed to spill,
 * which keeps it from introducing horizontal page scroll. From `sm` up the
 * fan returns to the contained treatment the desktop artboard uses.
 *
 * `preload` rather than `priority` — the latter is deprecated as of Next 16.
 */
export function HeroImageFan() {
  return (
    <div className="-mx-4 overflow-hidden sm:mx-0">
      <Image
        src="/design/lady-with-bag.webp"
        alt=""
        aria-hidden="true"
        width={1380}
        height={800}
        preload
        sizes="(max-width: 640px) 140vw, (max-width: 1024px) 90vw, 560px"
        className="hidden h-auto w-full sm:block"
      />
      <Image
        src="/design/buyer-mobile.webp"
        alt=""
        aria-hidden="true"
        width={828}
        height={480}
        preload
        sizes="140vw"
        className="ml-[-20%] h-auto w-[140%] max-w-none sm:hidden"
      />
    </div>
  );
}
