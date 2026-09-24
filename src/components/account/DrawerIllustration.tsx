import Image from "next/image";
import type { AccountIconName } from "./AccountIcon";
import styles from "./drawer.module.css";

const drawerArtwork: Partial<Record<AccountIconName, { src: string; height: number }>> = {
  layers: { src: "/account/drawer/activity-tv-ticket-controller.png", height: 105 },
  gift: { src: "/account/drawer/gift-cards.png", height: 105 },
  wallet: { src: "/account/drawer/leather-wallet.png", height: 105 },
  orders: { src: "/account/drawer/shipping-box.png", height: 105 },
  crew: { src: "/account/drawer/crew-figures.png", height: 105 },
  bell: { src: "/account/drawer/notification-bell.png", height: 105 },
  security: { src: "/account/drawer/security-shield.png", height: 82 },
};

/** Pixel-for-pixel crops from the approved 602 × 1502 drawer reference. */
export function DrawerIllustration({ name }: { name: AccountIconName }) {
  const artwork = drawerArtwork[name];
  if (!artwork) return null;
  return <Image
    src={artwork.src}
    width={168}
    height={artwork.height}
    unoptimized
    loading="eager"
    alt=""
    aria-hidden="true"
    draggable={false}
    className={styles.illustration}
  />;
}
