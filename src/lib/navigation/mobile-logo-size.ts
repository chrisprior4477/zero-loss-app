export const mobileLogoSizes = [0, 5, 10, 15, 20, 25, 30, 35] as const;
export type MobileLogoSize = (typeof mobileLogoSizes)[number];
export function isMobileLogoSize(value: unknown): value is MobileLogoSize {
  return mobileLogoSizes.some(size => size === value);
}
export function mobileLogoSizeOrOriginal(value: unknown): MobileLogoSize {
  return isMobileLogoSize(value) ? value : 0;
}
export function mobileLogoSizeLabel(size: MobileLogoSize) {
  return size === 0 ? "Original size" : `${size}% bigger`;
}
