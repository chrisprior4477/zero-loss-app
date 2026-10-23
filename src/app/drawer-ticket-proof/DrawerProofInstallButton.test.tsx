import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { INSTALL_APP_REQUEST_EVENT } from "@/components/layout/InstallAppPrompt";
import { DrawerProofInstallButton } from "./DrawerProofInstallButton";

afterEach(cleanup);

test("Add to Home Screen requests the existing install flow", () => {
  const requestInstall = vi.fn();
  window.addEventListener(INSTALL_APP_REQUEST_EVENT, requestInstall, { once: true });

  render(<DrawerProofInstallButton />);
  fireEvent.click(screen.getByRole("button", { name: "Add to Home Screen" }));

  expect(requestInstall).toHaveBeenCalledOnce();
});
