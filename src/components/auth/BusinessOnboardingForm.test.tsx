import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { BusinessOnboardingForm } from "./BusinessOnboardingForm";
import { businessSignupPath, guestDraftKey } from "@/lib/business/application";
import { signInReturnPath } from "@/lib/auth/entry-return";

vi.mock("@/lib/business/actions", () => ({ saveBusinessApplication: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

test("replay and a device reload preserve edited fields, listings, permissions and the selected demo", async () => {
  vi.stubGlobal("scrollTo", vi.fn());
  const show = () => render(<BusinessOnboardingForm owner={null} record={null}/>);
  show();
  const demo = screen.getByRole("button", { name: /Forge & Field National Tools Demo/ });
  await waitFor(() => expect(demo.closest("fieldset")?.disabled).toBe(false));
  fireEvent.click(demo);
  fireEvent.change(screen.getByLabelText(/Business name/), { target: { value: "Edited Tools" } });
  const next = () => fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  next(); next();
  fireEvent.change(screen.getByLabelText("Product or offer name"), { target: { value: "Edited first listing" } });
  fireEvent.click(document.querySelector<HTMLInputElement>('input[name="auto_relist"]')!);
  next();
  fireEvent.click(document.querySelector<HTMLInputElement>('input[name="asset_rights"]')!);
  fireEvent.click(screen.getByRole("button", { name: "Replay demo upload" }));
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  const saved = JSON.parse(localStorage.getItem(guestDraftKey)!);
  expect(saved.values).toMatchObject({ business_name: "Edited Tools", demo_variant: "tools", asset_rights: false, auto_relist: false });
  expect(saved.listings).toHaveLength(10);
  expect(saved.listings[0].title).toBe("Edited first listing");
  cleanup(); show();
  await screen.findByRole("button", { name: "Replay demo upload" });
  expect(document.querySelector<HTMLInputElement>('input[name="asset_rights"]')?.checked).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByLabelText("Product or offer name")).toHaveProperty("value","Edited first listing");
});

test("older unversioned device drafts recover their own demo and the business auth return is exact", async () => {
  localStorage.setItem(guestDraftKey, JSON.stringify({ partnership: "products", demo_variant: "restaurant", business_name: "My kitchen" }));
  render(<BusinessOnboardingForm owner={null} record={null}/>);
  await waitFor(() => expect(screen.getByLabelText(/Business name/)).toHaveProperty("value","My kitchen"));
  expect(screen.getByRole("button", { name: /Bellamora Italian Dining Demo/ }).getAttribute("aria-pressed")).toBe("true");
  expect(signInReturnPath(businessSignupPath)).toBe(businessSignupPath);
  expect(signInReturnPath(businessSignupPath + "&next=https://evil.example")).toBeNull();
});
