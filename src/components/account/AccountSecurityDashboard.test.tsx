import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AccountSecurityDashboard } from "./AccountSecurityDashboard";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} data-testid="security-art" /> }));
vi.mock("./ProfilePhotoCard", () => ({ ProfilePhotoCard: ({ fullName, email }: { fullName: string; email: string }) => <article><h2>{fullName}</h2><p>{email}</p><button type="button">Adjust profile photo</button></article> }));
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
  expect(screen.getAllByText("Not recorded")).toHaveLength(2);
  expect(screen.queryByText(/Windows PC|iPhone|New York|Boston/)).toBeNull();
  expect(screen.getByRole("link", { name: /Edit profile/ }).getAttribute("href")).toBe("/account/profile");
  expect(screen.getByRole("link", { name: /View account updates/ }).getAttribute("href")).toBe("/account/notifications");
});

test("keeps unavailable security actions honest and disabled", () => {
  render(<AccountSecurityDashboard {...props} />);
  for (const label of ["Change password", "Set up", "Manage devices"]) {
    expect((screen.getByRole("button", { name: new RegExp(label) }) as HTMLButtonElement).disabled).toBe(true);
  }
  expect(screen.getByText("+15551234821")).toBeTruthy();
});

test("shows safe fallbacks when optional account facts are absent", () => {
  render(<AccountSecurityDashboard {...props} emailConfirmed={false} memberSince={null} lastSignInAt={null} phone={null} />);
  expect(screen.getAllByText("Confirmation pending").length).toBeGreaterThan(0);
  expect(screen.getByText("Sign-in history is not available from this account yet.")).toBeTruthy();
  expect(screen.getByText("Not added")).toBeTruthy();
});
