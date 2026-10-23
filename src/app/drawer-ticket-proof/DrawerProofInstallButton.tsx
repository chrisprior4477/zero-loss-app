"use client";

import { AccountIcon } from "@/components/account/AccountIcon";
import { INSTALL_APP_REQUEST_EVENT } from "@/components/layout/InstallAppPrompt";
import styles from "./drawer-top-proof.module.css";

/** Mirrors the existing drawer's Add to Home Screen request in this local proof. */
export function DrawerProofInstallButton() {
  return (
    <button
      type="button"
      className={styles.installButton}
      onClick={() => window.dispatchEvent(new Event(INSTALL_APP_REQUEST_EVENT))}
    >
      <AccountIcon name="install" />
      <span>Add to Home Screen</span>
      <AccountIcon name="chevron" />
    </button>
  );
}
