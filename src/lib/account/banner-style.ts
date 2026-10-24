export const bannerStyles = ["capsule", "ribbon", "medallion", "ticket", "glass", "layers"] as const;
export type BannerStyle = typeof bannerStyles[number];
export const bannerStyleNames: Record<BannerStyle, string> = { capsule: "Glow capsule", ribbon: "Folded ribbon", medallion: "Medallion", ticket: "Prize ticket", glass: "Glass edge", layers: "Layered cards" };
export function bannerStyleOrDefault(value: unknown): BannerStyle {
  return bannerStyles.includes(value as BannerStyle) ? value as BannerStyle : "capsule";
}

export function bannerSpeedOrDefault(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10 ? value : 5;
}
export function bannerTiming(speed: number) {
  const revealMs = Math.round(1800 - (bannerSpeedOrDefault(speed) - 1) * (1600 / 9));
  return { revealMs, holdMs: 6000, gapMs: 200, cycleMs: revealMs * 2 + 6200 };
}
