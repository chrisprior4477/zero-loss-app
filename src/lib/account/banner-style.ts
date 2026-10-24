export const bannerStyles = ["capsule", "ribbon", "medallion", "ticket", "glass", "layers"] as const;
export type BannerStyle = typeof bannerStyles[number];
export const notificationPopupStyles = ["rounded", "ticket"] as const;
export type NotificationPopupStyle = typeof notificationPopupStyles[number];
export function notificationPopupStyleOrDefault(value: unknown): NotificationPopupStyle {
  return value === "ticket" ? "ticket" : "rounded";
}
export const bannerStyleNames: Record<BannerStyle, string> = { capsule: "Glow capsule", ribbon: "Folded ribbon", medallion: "Medallion", ticket: "Prize ticket", glass: "Glass edge", layers: "Layered cards" };
export function bannerStyleOrDefault(value: unknown): BannerStyle {
  return bannerStyles.includes(value as BannerStyle) ? value as BannerStyle : "capsule";
}

export function bannerSpeedOrDefault(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10 ? value : 5;
}
export function bannerDisplaySecondsOrDefault(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10 ? value : 6;
}
export function bannerTiming(speed: number, displaySeconds = 6) {
  const revealMs = Math.round(1800 - (bannerSpeedOrDefault(speed) - 1) * (1600 / 9));
  const holdMs = bannerDisplaySecondsOrDefault(displaySeconds) * 1000;
  return { revealMs, holdMs, gapMs: 200, cycleMs: revealMs * 2 + holdMs + 200 };
}
