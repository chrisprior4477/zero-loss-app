import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AccountSecurityDashboard } from "./AccountSecurityDashboard";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} data-testid="security-art" /> }));
vi.mock("./ProfilePhotoCard", () => ({ ProfilePhotoCard: ({ fullName, email, emailStatus }: { fullName: string; email: string; emailStatus?: "verified" | "pending" }) => <article><h2>{fullName}</h2><p>{email}</p>{emailStatus ? <span>{emailStatus === "verified" ? "Verified" : "Confirmation pending"}</span> : null}<button type="button">Adjust profile photo</button></article> }));
afterEach(cleanup);

const props = {
  displayName: "Chris Prior",
  initials: "CP",
  email: "chris@example.test",
  emailConfirmed: true,
  avatarUrl: null,
  memberSince: "2025-03-14T10:00:00Z",
  lastSignInAt: "2026-09-16T14:24:00Z",
  phone: "+15551234821",
};

test("uses verified account data without inventing device or location details", () => {
  render(<AccountSecurityDashboard {...props} />);
  expect(screen.getByRole("heading", { name: "Account & Security" })).toBeTruthy();
  expect(screen.getAllByText("Chris Prior").length).toBeGreaterThan(0);
  expect(screen.getAllByText("chris@example.test").length).toBeGreaterThan(0);
  expect(screen.getByText("Mar 14, 2025")).toBeTruthy();
  expect(screen.getByText("Device: Not recorded")).toBeTruthy();
  expect(screen.getByText("Location: Not recorded")).toBeTruthy();
  expect(screen.queryByText(/Windows PC|iPhone|New York|Boston/)).toBeNull();
  expect(screen.getByRole("link", { name: /Edit profile/ }).getAttribute("href")).toBe("/account/profile");
  expect(screen.getByRole("link", { name: /View account updates/ }).getAttribute("href")).toBe("/account/notifications");
});

test("opens a usable password form and honest explanations for unavailable controls", () => {
  render(<AccountSecurityDashboard {...props} />);
  const changePassword = screen.getByRole("button", { name: "Change password" }) as HTMLButtonElement;
  expect(changePassword.disabled).toBe(false);
  fireEvent.click(changePassword);
  expect(screen.getByLabelText("Current password")).toBeTruthy();
  expect(screen.getByLabelText("New password")).toBeTruthy();
  expect(screen.getByLabelText("Confirm new password")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Reset it by email/ }).getAttribute("href")).toBe("/forgot-password");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByLabelText("Current password")).toBeNull();
  for (const label of ["Two-step verification", "Passkeys", "Trusted devices", "Active sessions"]) {
    const disclosure = screen.getByText(label).closest("details") as HTMLDetailsElement;
    expect(disclosure.open).toBe(false);
    fireEvent.click(disclosure.querySelector("summary")!);
    expect(disclosure.open).toBe(true);
  }
  fireEvent.click(screen.getByText("Sign out everywhere", { selector: "summary" }));
  expect(screen.getByRole("button", { name: "Confirm: sign out everywhere" })).toBeTruthy();
  expect(screen.getByText("+15551234821")).toBeTruthy();
});

test("every account section and review link points to a working destination", () => {
  render(<AccountSecurityDashboard {...props} />);
  expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe("/account/profile");
  expect(screen.getByRole("link", { name: "Payment Methods" }).getAttribute("href")).toBe("/account/payment-methods");
  expect(screen.getByRole("link", { name: "Sharing Preferences" }).getAttribute("href")).toBe("/account/crew/display");
  expect(screen.getByRole("link", { name: "Review security" }).getAttribute("href")).toBe("#security-controls");
  expect(screen.getByRole("link", { name: /Manage sharing/ }).getAttribute("href")).toBe("/account/crew?tab=picks#sharing");
});

test("the shared account tickets retain their wallet, reward, and purchase destinations", () => {
  render(<AccountSecurityDashboard {...props} overview={{ balanceLabel: "$17", fundingEnabled: true, activity: storedActivityFixture() }} />);
  expect(screen.getByRole("link", { name: "Playable Wallet: $17" }).getAttribute("href")).toBe("/account/wallet?view=history");
  expect(screen.getByRole("link", { name: "Add funds" }).getAttribute("href")).toBe("/account/wallet?view=history#add-funds");
  expect(screen.getByRole("link", { name: /Prize Ready: 1/ }).getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv");
  expect(screen.getByRole("link", { name: /Purchase Options: 2/ }).getAttribute("href")).toBe("/account/entries?filter=completion");
});

test("shows safe fallbacks when optional account facts are absent", () => {
  render(<AccountSecurityDashboard {...props} emailConfirmed={false} memberSince={null} lastSignInAt={null} phone={null} />);
  expect(screen.getAllByText("Confirmation pending").length).toBeGreaterThan(0);
  expect(screen.getByText("Sign-in history is not available from this account yet.")).toBeTruthy();
  expect(screen.getByText("Not added")).toBeTruthy();
});
