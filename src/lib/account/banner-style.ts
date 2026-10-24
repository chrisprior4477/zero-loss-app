export const bannerStyles = ["capsule", "ribbon", "medallion", "ticket", "glass", "layers"] as const;
export type BannerStyle = typeof bannerStyles[number];
export const bannerStyleNames: Record<BannerStyle, string> = { capsule: "Glow capsule", ribbon: "Folded ribbon", medallion: "Medallion", ticket: "Prize ticket", glass: "Glass edge", layers: "Layered cards" };
export function bannerStyleOrDefault(value: unknown): BannerStyle {
  return bannerStyles.includes(value as BannerStyle) ? value as BannerStyle : "capsule";
}
